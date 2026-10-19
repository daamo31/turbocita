-- Identidad del cliente por teléfono normalizado (últimos 9 dígitos), para no duplicar
-- "600 00 00 00", "+34600000000" o "600000000". El primer nombre registrado se conserva.
alter table clients add column if not exists phone_key text
  generated always as (right(regexp_replace(phone, '\D', '', 'g'), 9)) stored;
create index if not exists clients_phone_key_idx on clients (business_id, phone_key);


-- Estado de sellos por teléfono, incluyendo las citas reservadas que aún no se han completado
drop function if exists loyalty_status_by_phone(uuid, text);
create or replace function loyalty_status_by_phone(p_business uuid, p_phone text)
returns table (
  current_stamps int, rewards_available int, upcoming int,
  next_stamps int, next_description text, max_stamps int
)
language sql stable security definer set search_path = public as $$
  with prog as (
    select id, service_id from loyalty_programs where business_id = p_business and is_active
  ),
  key as (select right(regexp_replace(p_phone, '\D', '', 'g'), 9) as k),
  cl as (
    select c.id from clients c, key
    where c.business_id = p_business and length(key.k) >= 7 and c.phone_key = key.k
  ),
  card as (
    select coalesce(sum(c.current_stamps), 0)::int as stamps, coalesce(sum(c.rewards_available), 0)::int as rewards
    from client_loyalty_cards c join prog on prog.id = c.program_id
    where c.client_id in (select id from cl)
  ),
  up as (
    select count(*)::int as n from appointments a, prog
    where a.client_id in (select id from cl) and a.status in ('pending', 'confirmed')
      and (prog.service_id is null or a.service_id = prog.service_id
           or exists (select 1 from appointment_services s where s.appointment_id = a.id and s.service_id = prog.service_id))
  )
  select
    card.stamps, card.rewards, up.n,
    (select t.stamps from loyalty_tiers t join prog on prog.id = t.program_id where t.stamps > card.stamps order by t.stamps limit 1),
    (select t.description from loyalty_tiers t join prog on prog.id = t.program_id where t.stamps > card.stamps order by t.stamps limit 1),
    (select max(t.stamps) from loyalty_tiers t join prog on prog.id = t.program_id)
  from card, up
  where exists (select 1 from prog);
$$;
revoke all on function loyalty_status_by_phone from public, anon, authenticated;
grant execute on function loyalty_status_by_phone to service_role;

create or replace function create_public_booking(
  p_business uuid, p_services uuid[], p_professional uuid, p_starts_at timestamptz,
  p_name text, p_phone text, p_email text, p_notes text
) returns table (appointment_id uuid, cancel_token uuid, ends_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_duration int; v_count int; v_client uuid; v_end timestamptz; v_appt uuid; v_pro uuid;
  v_in_hours boolean := false;
begin
  if p_services is null or cardinality(p_services) = 0 then raise exception 'invalid_service'; end if;

  select count(*), sum(duration_min) into v_count, v_duration from services
   where id = any(p_services) and business_id = p_business and active;
  if v_count <> (select count(distinct x) from unnest(p_services) x) then
    raise exception 'invalid_service';
  end if;

  if p_starts_at <= now() then raise exception 'past_date'; end if;
  v_end := p_starts_at + make_interval(mins => v_duration);

  -- Un mismo teléfono (con o sin espacios/prefijo) es siempre el mismo cliente del negocio
  select id into v_client from clients
   where business_id = p_business and phone_key = right(regexp_replace(p_phone, '\D', '', 'g'), 9)
   order by created_at limit 1;
  if v_client is null then
    insert into clients (business_id, name, phone, email)
    values (p_business, p_name, p_phone, p_email)
    on conflict (business_id, phone) do update set email = coalesce(clients.email, excluded.email)
    returning id into v_client;
  elsif p_email is not null then
    update clients set email = coalesce(email, p_email) where id = v_client;
  end if;

  -- Prueba cada profesional activo con horario a esa hora; el primero libre se queda la cita
  for v_pro in
    select p.id from professionals p
     where p.business_id = p_business and p.active
       and (p_professional is null or p.id = p_professional)
       and exists (
         select 1 from working_hours wh, businesses b
          where wh.professional_id = p.id and b.id = p_business
            and wh.weekday = extract(dow from p_starts_at at time zone b.timezone)
            and (p_starts_at at time zone b.timezone)::time >= wh.start_time
            and (v_end at time zone b.timezone)::time <= wh.end_time)
     order by p.created_at, p.id
  loop
    v_in_hours := true;
    begin
      insert into appointments (business_id, client_id, professional_id, service_id, starts_at, ends_at, notes)
      values (p_business, v_client, v_pro, p_services[1], p_starts_at, v_end, p_notes)
      returning id into v_appt;
      exit;
    exception when exclusion_violation then
      v_appt := null;
    end;
  end loop;

  if v_appt is null then
    if v_in_hours then raise exception 'slot_taken'; else raise exception 'outside_hours'; end if;
  end if;

  insert into appointment_services (appointment_id, service_id, name, price, duration_min, position)
  select v_appt, s.id, s.name, s.price, s.duration_min, array_position(p_services, s.id)
  from services s where s.id = any(p_services);

  return query select a.id, a.cancel_token, a.ends_at from appointments a where a.id = v_appt;
end $$;

revoke all on function create_public_booking from public, anon, authenticated;
grant execute on function create_public_booking to service_role;
