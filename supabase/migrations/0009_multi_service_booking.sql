-- Una cita puede incluir varios servicios (p. ej. corte + barba).
-- appointments.service_id se mantiene como servicio principal (el primero).
create table appointment_services (
  appointment_id uuid not null references appointments(id) on delete cascade,
  service_id uuid references services(id) on delete set null,
  name text not null,
  price numeric(10,2) not null,
  duration_min int not null,
  position smallint not null default 0
);
create index on appointment_services (appointment_id);

alter table appointment_services enable row level security;
create policy "members appointment_services" on appointment_services for all
  using (exists (select 1 from appointments a where a.id = appointment_id and is_member(a.business_id)))
  with check (exists (select 1 from appointments a where a.id = appointment_id and is_member(a.business_id)));

-- Citas existentes: un servicio cada una
insert into appointment_services (appointment_id, service_id, name, price, duration_min)
select a.id, a.service_id, s.name, s.price, s.duration_min
from appointments a join services s on s.id = a.service_id;

drop function if exists create_public_booking(uuid, uuid, uuid, timestamptz, text, text, text, text);

create or replace function create_public_booking(
  p_business uuid, p_services uuid[], p_professional uuid, p_starts_at timestamptz,
  p_name text, p_phone text, p_email text, p_notes text
) returns table (appointment_id uuid, cancel_token uuid, ends_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_duration int; v_count int; v_client uuid; v_end timestamptz; v_appt uuid;
begin
  if p_services is null or cardinality(p_services) = 0 then raise exception 'invalid_service'; end if;

  select count(*), sum(duration_min) into v_count, v_duration from services
   where id = any(p_services) and business_id = p_business and active;
  if v_count <> (select count(distinct x) from unnest(p_services) x) then
    raise exception 'invalid_service';
  end if;

  if (select count(*) from professional_services ps
        join professionals p on p.id = ps.professional_id
       where ps.professional_id = p_professional and ps.service_id = any(p_services)
         and p.business_id = p_business and p.active) <> v_count then
    raise exception 'invalid_professional';
  end if;

  if p_starts_at <= now() then raise exception 'past_date'; end if;
  v_end := p_starts_at + make_interval(mins => v_duration);

  if not exists (
    select 1 from working_hours wh, businesses b
    where wh.professional_id = p_professional and b.id = p_business
      and wh.weekday = extract(dow from p_starts_at at time zone b.timezone)
      and (p_starts_at at time zone b.timezone)::time >= wh.start_time
      and (v_end at time zone b.timezone)::time <= wh.end_time
  ) then raise exception 'outside_hours'; end if;

  insert into clients (business_id, name, phone, email)
  values (p_business, p_name, p_phone, p_email)
  on conflict (business_id, phone) do update
    set name = excluded.name, email = coalesce(excluded.email, clients.email)
  returning id into v_client;

  begin
    insert into appointments (business_id, client_id, professional_id, service_id, starts_at, ends_at, notes)
    values (p_business, v_client, p_professional, p_services[1], p_starts_at, v_end, p_notes)
    returning id into v_appt;
  exception when exclusion_violation then
    raise exception 'slot_taken';
  end;

  insert into appointment_services (appointment_id, service_id, name, price, duration_min, position)
  select v_appt, s.id, s.name, s.price, s.duration_min, array_position(p_services, s.id)
  from services s where s.id = any(p_services);

  return query select a.id, a.cancel_token, a.ends_at from appointments a where a.id = v_appt;
end $$;

revoke all on function create_public_booking from public, anon, authenticated;
grant execute on function create_public_booking to service_role;
