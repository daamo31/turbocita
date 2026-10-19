-- Fidelización con niveles configurables por el dueño (ej. 5 sellos = 50% dto, 10 sellos = gratis).
-- Cada nivel desbloquea una recompensa individual y canjeable; al completar el último nivel el ciclo se reinicia.

create table loyalty_tiers (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references loyalty_programs(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  stamps int not null check (stamps between 1 and 100),
  discount_percent int not null check (discount_percent between 1 and 100),
  description text not null check (char_length(description) between 1 and 160),
  unique (program_id, stamps)
);
create index on loyalty_tiers (business_id);

-- Recompensas concedidas: guardan una copia del descuento por si el dueño cambia el programa después
create table loyalty_rewards (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  card_id uuid not null references client_loyalty_cards(id) on delete cascade,
  program_id uuid not null references loyalty_programs(id) on delete cascade,
  tier_id uuid references loyalty_tiers(id) on delete set null,
  discount_percent int not null check (discount_percent between 1 and 100),
  description text not null,
  status text not null default 'available' check (status in ('available', 'redeemed')),
  created_at timestamptz not null default now(),
  redeemed_at timestamptz,
  redeemed_booking_id uuid references appointments(id) on delete set null
);
create index on loyalty_rewards (card_id) where status = 'available';
create index on loyalty_rewards (client_id);

alter table loyalty_history add column reward_id uuid references loyalty_rewards(id) on delete set null;
alter table appointments add column reward_discount_percent int check (reward_discount_percent between 1 and 100);

-- ───────── Migración de datos del modelo anterior (un solo nivel "gratis") ─────────
insert into loyalty_tiers (program_id, business_id, stamps, discount_percent, description)
  select id, business_id, required_stamps, 100, reward_description from loyalty_programs;

insert into loyalty_rewards (business_id, client_id, card_id, program_id, tier_id, discount_percent, description)
  select c.business_id, c.client_id, c.id, c.program_id, t.id, 100, t.description
  from client_loyalty_cards c
  join loyalty_tiers t on t.program_id = c.program_id
  cross join lateral generate_series(1, c.rewards_available);

update appointments set reward_discount_percent = 100 where reward_redeemed;

-- ───────── RLS ─────────
alter table loyalty_tiers   enable row level security;
alter table loyalty_rewards enable row level security;

-- Los niveles solo se escriben vía save_loyalty_program()
create policy "members tiers" on loyalty_tiers for select using (is_member(business_id));
create policy "clients read tiers" on loyalty_tiers for select
  using (exists (select 1 from clients c where c.business_id = loyalty_tiers.business_id and c.auth_user_id = auth.uid()));
create policy "members rewards" on loyalty_rewards for select using (is_member(business_id));
create policy "client own rewards" on loyalty_rewards for select
  using (exists (select 1 from clients c where c.id = client_id and c.auth_user_id = auth.uid()));

revoke insert, update, delete on loyalty_tiers, loyalty_rewards from anon, authenticated;
revoke all on loyalty_tiers, loyalty_rewards from anon;

-- ───────── Guardar programa + niveles (solo dueño, atómico) ─────────
-- p_tiers: [{"stamps":5,"discount_percent":50,"description":"opcional"}, ...]
create or replace function save_loyalty_program(p_business uuid, p_service uuid, p_tiers jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  prog_id uuid;
  n int;
begin
  if not is_owner(p_business) then raise exception 'Solo el dueño puede configurar la fidelización'; end if;
  if jsonb_typeof(p_tiers) <> 'array' then raise exception 'Niveles no válidos'; end if;
  n := jsonb_array_length(p_tiers);
  if n < 1 or n > 10 then raise exception 'Define entre 1 y 10 niveles'; end if;

  select id into prog_id from loyalty_programs where business_id = p_business and is_active for update;
  if prog_id is null then
    insert into loyalty_programs (business_id, service_id, required_stamps, reward_description)
      values (p_business, p_service, 1, '-') returning id into prog_id;
  else
    update loyalty_programs set service_id = p_service where id = prog_id;
  end if;

  delete from loyalty_tiers where program_id = prog_id;
  insert into loyalty_tiers (program_id, business_id, stamps, discount_percent, description)
    select prog_id, p_business, t.stamps, t.discount_percent,
           coalesce(nullif(btrim(t.description), ''),
                    case when t.discount_percent = 100 then 'Servicio gratis' else t.discount_percent || '% de descuento' end)
    from jsonb_to_recordset(p_tiers) as t(stamps int, discount_percent int, description text);

  update loyalty_programs p set
    required_stamps = (select max(stamps) from loyalty_tiers where program_id = prog_id),
    reward_description = (select string_agg(stamps || ' sellos: ' || description, ' · ' order by stamps)
                          from loyalty_tiers where program_id = prog_id)
  where p.id = prog_id;

  return prog_id;
end $$;

revoke all on function save_loyalty_program from public, anon;
grant execute on function save_loyalty_program to authenticated;

-- ───────── Completar cita: sello + desbloqueo de niveles + canje opcional ─────────
drop function if exists complete_appointment(uuid, boolean);

create or replace function complete_appointment(p_appointment uuid, p_reward uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  a appointments%rowtype;
  prog loyalty_programs%rowtype;
  card client_loyalty_cards%rowtype;
  rw loyalty_rewards%rowtype;
  t loyalty_tiers%rowtype;
  new_rw_id uuid;
  applies boolean := false;
  max_stamps int;
  v_stamps int;
  stamp_awarded boolean := false;
  redeemed_pct int;
  unlocked jsonb := '[]'::jsonb;
begin
  select * into a from appointments where id = p_appointment for update;
  if not found or not is_member(a.business_id) then raise exception 'Cita no encontrada'; end if;
  if a.status not in ('pending', 'confirmed') then raise exception 'La cita ya está %', a.status; end if;

  select * into prog from loyalty_programs where business_id = a.business_id and is_active;
  if found then
    applies := prog.service_id is null
      or a.service_id = prog.service_id
      or exists (select 1 from appointment_services s where s.appointment_id = a.id and s.service_id = prog.service_id);
  end if;

  if p_reward is not null and not applies then
    raise exception 'No hay un programa de fidelización aplicable a esta cita';
  end if;

  if applies then
    insert into client_loyalty_cards (client_id, business_id, program_id)
      values (a.client_id, a.business_id, prog.id)
      on conflict (client_id, program_id) do nothing;
    select * into card from client_loyalty_cards where client_id = a.client_id and program_id = prog.id for update;
    select coalesce(max(lt.stamps), prog.required_stamps) into max_stamps from loyalty_tiers lt where lt.program_id = prog.id;
    v_stamps := card.current_stamps;

    if p_reward is not null then
      select * into rw from loyalty_rewards
        where id = p_reward and card_id = card.id and status = 'available' for update;
      if not found then raise exception 'Recompensa no disponible para este cliente'; end if;
      update loyalty_rewards set status = 'redeemed', redeemed_at = now(), redeemed_booking_id = a.id where id = rw.id;
      insert into loyalty_history (business_id, client_id, card_id, booking_id, stamps_awarded, action_type, reward_id)
        values (a.business_id, a.client_id, card.id, a.id, 0, 'REDEEMED', rw.id);
      redeemed_pct := rw.discount_percent;
    end if;

    -- Un servicio 100% gratis no suma sello; uno con descuento parcial sí (permite llegar al siguiente nivel)
    if redeemed_pct is distinct from 100 then
      v_stamps := v_stamps + 1;
      stamp_awarded := true;
      insert into loyalty_history (business_id, client_id, card_id, booking_id, stamps_awarded, action_type)
        values (a.business_id, a.client_id, card.id, a.id, 1, 'EARNED');

      for t in select * from loyalty_tiers where program_id = prog.id and loyalty_tiers.stamps = v_stamps loop
        insert into loyalty_rewards (business_id, client_id, card_id, program_id, tier_id, discount_percent, description)
          values (a.business_id, a.client_id, card.id, prog.id, t.id, t.discount_percent, t.description)
          returning id into new_rw_id;
        unlocked := unlocked || jsonb_build_object('id', new_rw_id, 'discount_percent', t.discount_percent, 'description', t.description);
        update client_loyalty_cards set total_rewards_earned = total_rewards_earned + 1 where id = card.id;
      end loop;

      if v_stamps >= max_stamps then v_stamps := 0; end if; -- ciclo completado
    end if;

    update client_loyalty_cards set
      current_stamps = v_stamps,
      rewards_available = (select count(*) from loyalty_rewards where card_id = card.id and status = 'available'),
      updated_at = now()
    where id = card.id returning * into card;
  end if;

  update appointments set status = 'completed', reward_redeemed = redeemed_pct is not null,
         reward_discount_percent = redeemed_pct where id = a.id;

  return jsonb_build_object(
    'applies', applies,
    'stamp_awarded', stamp_awarded,
    'rewards_unlocked', unlocked,
    'redeemed_discount_percent', redeemed_pct,
    'current_stamps', case when applies then card.current_stamps end,
    'required_stamps', case when applies then max_stamps end,
    'rewards_available', case when applies then card.rewards_available end
  );
end $$;

revoke all on function complete_appointment from public, anon;
grant execute on function complete_appointment to authenticated;
