-- Sistema de fidelización: sellos por servicio completado y recompensas canjeables.
-- Se reutiliza la tabla `clients` existente (cliente por negocio, identificado por teléfono)
-- añadiéndole el vínculo opcional con una cuenta de Supabase Auth.

-- ───────── clients: vínculo con cuenta ─────────
alter table clients add column auth_user_id uuid references auth.users(id) on delete set null;
create unique index clients_business_auth_user_key on clients (business_id, auth_user_id) where auth_user_id is not null;
create index clients_auth_user_idx on clients (auth_user_id) where auth_user_id is not null;

-- El cliente nunca modifica su ficha por API (solo el negocio, vía RLS de miembros)
create policy "client reads own profile" on clients for select using (auth.uid() = auth_user_id);

-- ───────── Tablas ─────────
create type loyalty_action as enum ('EARNED', 'REDEEMED');

create table loyalty_programs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  service_id uuid references services(id) on delete cascade, -- null = aplica a cualquier servicio
  required_stamps int not null default 10 check (required_stamps between 1 and 100),
  reward_description text not null check (char_length(reward_description) between 1 and 160),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
-- Un único programa activo por negocio
create unique index loyalty_programs_one_active on loyalty_programs (business_id) where is_active;

create table client_loyalty_cards (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  program_id uuid not null references loyalty_programs(id) on delete cascade,
  current_stamps int not null default 0 check (current_stamps >= 0),
  rewards_available int not null default 0 check (rewards_available >= 0),
  total_rewards_earned int not null default 0 check (total_rewards_earned >= 0),
  updated_at timestamptz not null default now(),
  unique (client_id, program_id)
);
create index on client_loyalty_cards (business_id);

create table loyalty_history (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  card_id uuid not null references client_loyalty_cards(id) on delete cascade,
  booking_id uuid references appointments(id) on delete set null,
  stamps_awarded int not null default 0,
  action_type loyalty_action not null,
  created_at timestamptz not null default now()
);
create index on loyalty_history (client_id, created_at desc);
-- Idempotencia: una cita solo puede sumar un sello y canjear un premio una vez
create unique index loyalty_history_booking_action on loyalty_history (booking_id, action_type) where booking_id is not null;

alter table appointments add column reward_redeemed boolean not null default false;

-- ───────── RLS ─────────
alter table loyalty_programs     enable row level security;
alter table client_loyalty_cards enable row level security;
alter table loyalty_history      enable row level security;

create policy "members loyalty_programs" on loyalty_programs for all
  using (is_member(business_id)) with check (is_member(business_id));
create policy "clients read programs" on loyalty_programs for select
  using (exists (select 1 from clients c where c.business_id = loyalty_programs.business_id and c.auth_user_id = auth.uid()));

-- Tarjetas e historial: lectura para el negocio y para su propio cliente; escritura solo vía complete_appointment()
create policy "members cards" on client_loyalty_cards for select using (is_member(business_id));
create policy "client own cards" on client_loyalty_cards for select
  using (exists (select 1 from clients c where c.id = client_id and c.auth_user_id = auth.uid()));
create policy "members history" on loyalty_history for select using (is_member(business_id));
create policy "client own history" on loyalty_history for select
  using (exists (select 1 from clients c where c.id = client_id and c.auth_user_id = auth.uid()));

revoke insert, update, delete on client_loyalty_cards, loyalty_history from anon, authenticated;
revoke all on loyalty_programs, client_loyalty_cards, loyalty_history from anon;

-- Coherencia multi-tenant del programa
create or replace function loyalty_program_same_business() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.service_id is not null
     and not exists (select 1 from services where id = new.service_id and business_id = new.business_id) then
    raise exception 'El servicio no pertenece al negocio';
  end if;
  return new;
end $$;
create trigger loyalty_program_same_business before insert or update on loyalty_programs
  for each row execute function loyalty_program_same_business();

-- ───────── Completar cita + sellos (transacción atómica) ─────────
create or replace function complete_appointment(p_appointment uuid, p_redeem boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  a appointments%rowtype;
  prog loyalty_programs%rowtype;
  card client_loyalty_cards%rowtype;
  applies boolean;
  stamp_awarded boolean := false;
  reward_unlocked boolean := false;
  redeemed boolean := false;
begin
  select * into a from appointments where id = p_appointment for update;
  if not found or not is_member(a.business_id) then
    raise exception 'Cita no encontrada';
  end if;
  if a.status not in ('pending', 'confirmed') then
    raise exception 'La cita ya está %', a.status;
  end if;

  select * into prog from loyalty_programs where business_id = a.business_id and is_active;
  if found then
    applies := prog.service_id is null
      or a.service_id = prog.service_id
      or exists (select 1 from appointment_services s where s.appointment_id = a.id and s.service_id = prog.service_id);
  else
    applies := false;
  end if;

  if p_redeem and not applies then
    raise exception 'No hay un programa de fidelización aplicable a esta cita';
  end if;

  if applies then
    insert into client_loyalty_cards (client_id, business_id, program_id)
      values (a.client_id, a.business_id, prog.id)
      on conflict (client_id, program_id) do nothing;
    select * into card from client_loyalty_cards where client_id = a.client_id and program_id = prog.id for update;

    if p_redeem then
      if card.rewards_available < 1 then
        raise exception 'El cliente no tiene recompensas disponibles';
      end if;
      update client_loyalty_cards set rewards_available = rewards_available - 1, updated_at = now() where id = card.id
        returning * into card;
      insert into loyalty_history (business_id, client_id, card_id, booking_id, stamps_awarded, action_type)
        values (a.business_id, a.client_id, card.id, a.id, 0, 'REDEEMED');
      redeemed := true;
    else
      update client_loyalty_cards
        set current_stamps = current_stamps + 1, updated_at = now() where id = card.id
        returning * into card;
      insert into loyalty_history (business_id, client_id, card_id, booking_id, stamps_awarded, action_type)
        values (a.business_id, a.client_id, card.id, a.id, 1, 'EARNED');
      stamp_awarded := true;
      if card.current_stamps >= prog.required_stamps then
        update client_loyalty_cards
          set current_stamps = current_stamps - prog.required_stamps,
              rewards_available = rewards_available + 1,
              total_rewards_earned = total_rewards_earned + 1
          where id = card.id returning * into card;
        reward_unlocked := true;
      end if;
    end if;
  end if;

  update appointments set status = 'completed', reward_redeemed = redeemed where id = a.id;

  return jsonb_build_object(
    'applies', applies,
    'stamp_awarded', stamp_awarded,
    'reward_unlocked', reward_unlocked,
    'reward_redeemed', redeemed,
    'current_stamps', case when applies then card.current_stamps end,
    'required_stamps', case when applies then prog.required_stamps end,
    'rewards_available', case when applies then card.rewards_available end
  );
end $$;

revoke all on function complete_appointment from public, anon;
grant execute on function complete_appointment to authenticated;

-- ───────── Vincular cuenta de cliente (identidad verificada por Auth) ─────────
-- Enlaza las fichas del negocio cuyo email/teléfono coincide con los CONFIRMADOS en la cuenta.
create or replace function link_client_account(p_business uuid)
returns int language plpgsql security definer set search_path = public, auth as $$
declare
  u auth.users%rowtype;
  n int;
begin
  select * into u from auth.users where id = auth.uid();
  if not found then raise exception 'No autenticado'; end if;

  update clients c set auth_user_id = u.id
   where c.business_id = p_business
     and c.auth_user_id is null
     and not exists (select 1 from clients x where x.business_id = p_business and x.auth_user_id = u.id)
     and (
       (u.email_confirmed_at is not null and c.email is not null and lower(c.email) = lower(u.email))
       or (u.phone_confirmed_at is not null and nullif(u.phone, '') is not null and regexp_replace(c.phone, '\D', '', 'g') = regexp_replace(u.phone, '\D', '', 'g'))
     );
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function link_client_account from public, anon;
grant execute on function link_client_account to authenticated;
