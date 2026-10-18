-- Endurecimiento tras auditoría de seguridad

-- ───────── 1) businesses: un dueño solo puede editar columnas seguras vía API ─────────
-- slug, custom_domain y logo_url solo se cambian desde el servidor (service_role) tras validar.
revoke update on businesses from anon, authenticated;
grant update (name, phone, address, theme, layout, pattern, card_style, brand_color,
              tagline, description, default_schedule) on businesses to authenticated;

alter table businesses
  add constraint businesses_name_len check (char_length(name) between 1 and 100) not valid,
  add constraint businesses_phone_len check (char_length(phone) <= 30) not valid,
  add constraint businesses_address_len check (char_length(address) <= 160) not valid;

-- ───────── 2) Referencias entre negocios (multi-tenant) ─────────
create or replace function enforce_same_business() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'appointments' then
    if not exists (select 1 from professionals where id = new.professional_id and business_id = new.business_id)
       or not exists (select 1 from services where id = new.service_id and business_id = new.business_id)
       or not exists (select 1 from clients where id = new.client_id and business_id = new.business_id) then
      raise exception 'cross_tenant_reference';
    end if;
  elsif tg_table_name = 'professional_services' then
    if not exists (select 1 from professionals p join services s on s.business_id = p.business_id
                   where p.id = new.professional_id and s.id = new.service_id) then
      raise exception 'cross_tenant_reference';
    end if;
  elsif tg_table_name = 'appointment_services' then
    if new.service_id is not null and not exists (
         select 1 from appointments a join services s on s.business_id = a.business_id
         where a.id = new.appointment_id and s.id = new.service_id) then
      raise exception 'cross_tenant_reference';
    end if;
  elsif tg_table_name = 'stock_movements' then
    if not exists (select 1 from products where id = new.product_id and business_id = new.business_id) then
      raise exception 'cross_tenant_reference';
    end if;
  elsif tg_table_name = 'documents' then
    if (new.client_id is not null and not exists
          (select 1 from clients where id = new.client_id and business_id = new.business_id))
       or (new.appointment_id is not null and not exists
          (select 1 from appointments where id = new.appointment_id and business_id = new.business_id)) then
      raise exception 'cross_tenant_reference';
    end if;
  elsif tg_table_name = 'document_items' then
    if (new.service_id is not null and not exists (
          select 1 from documents d join services s on s.business_id = d.business_id
          where d.id = new.document_id and s.id = new.service_id))
       or (new.product_id is not null and not exists (
          select 1 from documents d join products p on p.business_id = d.business_id
          where d.id = new.document_id and p.id = new.product_id)) then
      raise exception 'cross_tenant_reference';
    end if;
  end if;
  return new;
end $$;

create trigger same_business before insert or update on appointments
  for each row execute function enforce_same_business();
create trigger same_business before insert or update on professional_services
  for each row execute function enforce_same_business();
create trigger same_business before insert or update on appointment_services
  for each row execute function enforce_same_business();
create trigger same_business before insert or update on stock_movements
  for each row execute function enforce_same_business();
create trigger same_business before insert or update on documents
  for each row execute function enforce_same_business();
create trigger same_business before insert or update on document_items
  for each row execute function enforce_same_business();

-- ───────── 3) Límite de peticiones (reservas públicas) ─────────
create table rate_limits (
  key text not null,
  created_at timestamptz not null default now()
);
create index on rate_limits (key, created_at);
alter table rate_limits enable row level security; -- sin políticas: solo service_role

-- Devuelve true si la petición está permitida (y la registra)
create or replace function check_rate_limit(p_key text, p_max int, p_window interval)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  perform pg_advisory_xact_lock(hashtext(p_key));
  select count(*) into v_count from rate_limits where key = p_key and created_at > now() - p_window;
  if v_count >= p_max then return false; end if;
  insert into rate_limits (key) values (p_key);
  if random() < 0.02 then delete from rate_limits where created_at < now() - interval '2 days'; end if;
  return true;
end $$;
revoke all on function check_rate_limit from public, anon, authenticated;
grant execute on function check_rate_limit to service_role;

-- ───────── 4) Reserva pública: no sobrescribir datos de clientes existentes ─────────
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

  -- Un teléfono existente conserva su nombre; el email solo se rellena si estaba vacío
  insert into clients (business_id, name, phone, email)
  values (p_business, p_name, p_phone, p_email)
  on conflict (business_id, phone) do update
    set email = coalesce(clients.email, excluded.email)
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
