-- TurboCita: esquema multi-tenant (1 negocio = 1 tenant)
create extension if not exists btree_gist;
create extension if not exists pgcrypto;

-- ───────── Tipos ─────────
create type member_role as enum ('owner', 'employee');
create type appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
create type document_type as enum ('quote', 'invoice');
create type payment_status as enum ('pending', 'paid', 'cancelled');

-- ───────── Tablas ─────────
create table businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,                 -- /reservar/[slug]
  phone text,
  email text,
  address text,
  tax_id text,
  currency char(3) not null default 'EUR',
  timezone text not null default 'Europe/Madrid',
  created_at timestamptz not null default now()
);

create table business_members (
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role member_role not null default 'employee',
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);
create index on business_members (user_id);

create table services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  description text,
  duration_min int not null check (duration_min > 0),
  price numeric(10,2) not null check (price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on services (business_id);

create table professionals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on professionals (business_id);

create table professional_services (
  professional_id uuid not null references professionals(id) on delete cascade,
  service_id uuid not null references services(id) on delete cascade,
  primary key (professional_id, service_id)
);

create table working_hours (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references professionals(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = domingo
  start_time time not null,
  end_time time not null,
  check (end_time > start_time)
);
create index on working_hours (professional_id, weekday);

create table clients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  unique (business_id, phone)
);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  client_id uuid not null references clients(id) on delete restrict,
  professional_id uuid not null references professionals(id) on delete restrict,
  service_id uuid not null references services(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status appointment_status not null default 'pending',
  notes text,
  cancel_token uuid not null default gen_random_uuid(), -- para que el cliente cancele sin cuenta
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  -- Impide solapes del mismo profesional (atómico, sin race conditions)
  constraint no_overlap exclude using gist (
    professional_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status in ('pending', 'confirmed'))
);
create index on appointments (business_id, starts_at);

create table products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  sku text,
  price numeric(10,2) not null check (price >= 0),
  stock int not null default 0 check (stock >= 0),
  min_stock int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on products (business_id);

create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  delta int not null,
  reason text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  appointment_id uuid references appointments(id) on delete set null,
  type document_type not null,
  number int not null,                       -- correlativo por negocio y tipo
  status payment_status not null default 'pending',
  issue_date date not null default current_date,
  due_date date,
  tax_rate numeric(5,2) not null default 21,
  notes text,
  created_at timestamptz not null default now(),
  unique (business_id, type, number)
);
create index on documents (business_id, created_at desc);

create table document_items (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  service_id uuid references services(id) on delete set null,
  product_id uuid references products(id) on delete set null,
  description text not null,
  quantity numeric(10,2) not null check (quantity > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0)
);
create index on document_items (document_id);

-- Siguiente número correlativo (usar dentro de transacción; el unique evita duplicados)
create or replace function next_document_number(p_business uuid, p_type document_type)
returns int language sql stable as $$
  select coalesce(max(number), 0) + 1 from documents
  where business_id = p_business and type = p_type;
$$;

-- ───────── Helpers de RLS ─────────
create or replace function is_member(b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from business_members where business_id = b and user_id = auth.uid());
$$;

create or replace function is_owner(b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from business_members
                 where business_id = b and user_id = auth.uid() and role = 'owner');
$$;

-- ───────── Alta de negocio (registro) ─────────
create or replace function create_business(p_name text, p_slug text)
returns uuid language plpgsql security definer set search_path = public as $$
declare b uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into businesses (name, slug) values (p_name, p_slug) returning id into b;
  insert into business_members (business_id, user_id, role) values (b, auth.uid(), 'owner');
  return b;
end $$;

-- ───────── Reserva pública (atómica) ─────────
-- Solo ejecutable con service_role (desde el Server Action). Calcula fin en servidor.
create or replace function create_public_booking(
  p_business uuid, p_service uuid, p_professional uuid, p_starts_at timestamptz,
  p_name text, p_phone text, p_email text, p_notes text
) returns table (appointment_id uuid, cancel_token uuid, ends_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_duration int; v_client uuid; v_end timestamptz;
begin
  select duration_min into v_duration from services
   where id = p_service and business_id = p_business and active;
  if v_duration is null then raise exception 'invalid_service'; end if;

  if not exists (select 1 from professional_services ps
                 join professionals p on p.id = ps.professional_id
                 where ps.professional_id = p_professional and ps.service_id = p_service
                   and p.business_id = p_business and p.active) then
    raise exception 'invalid_professional';
  end if;

  if p_starts_at <= now() then raise exception 'past_date'; end if;
  v_end := p_starts_at + make_interval(mins => v_duration);

  -- Dentro del horario laboral del profesional (en la zona horaria del negocio)
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
    return query
    insert into appointments as a (business_id, client_id, professional_id, service_id, starts_at, ends_at, notes)
    values (p_business, v_client, p_professional, p_service, p_starts_at, v_end, p_notes)
    returning a.id, a.cancel_token, a.ends_at;
  exception when exclusion_violation then
    raise exception 'slot_taken';
  end;
end $$;

revoke all on function create_public_booking from public, anon, authenticated;
grant execute on function create_public_booking to service_role;

-- Huecos ocupados (pública, sin exponer datos de clientes)
create or replace function busy_slots(p_professional uuid, p_from timestamptz, p_to timestamptz)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = public as $$
  select a.starts_at, a.ends_at from appointments a
  where a.professional_id = p_professional and a.status in ('pending','confirmed')
    and a.starts_at < p_to and a.ends_at > p_from;
$$;
grant execute on function busy_slots to anon, authenticated;

-- ───────── RLS ─────────
alter table businesses            enable row level security;
alter table business_members      enable row level security;
alter table services              enable row level security;
alter table professionals         enable row level security;
alter table professional_services enable row level security;
alter table working_hours         enable row level security;
alter table clients               enable row level security;
alter table appointments          enable row level security;
alter table products              enable row level security;
alter table stock_movements       enable row level security;
alter table documents             enable row level security;
alter table document_items        enable row level security;

-- businesses (insert solo vía create_business())
create policy "public read businesses" on businesses for select using (true);
create policy "owner update business" on businesses for update using (is_owner(id));

-- members
create policy "see own memberships" on business_members for select
  using (user_id = auth.uid() or is_owner(business_id));
create policy "owner manages members" on business_members for all
  using (is_owner(business_id)) with check (is_owner(business_id));

-- catálogo público (lectura anónima para reservas), escritura solo miembros
create policy "public read services" on services for select using (active or is_member(business_id));
create policy "members write services" on services for all
  using (is_member(business_id)) with check (is_member(business_id));

create policy "public read professionals" on professionals for select using (active or is_member(business_id));
create policy "members write professionals" on professionals for all
  using (is_member(business_id)) with check (is_member(business_id));

create policy "public read prof services" on professional_services for select using (true);
create policy "members write prof services" on professional_services for all
  using (exists (select 1 from professionals p where p.id = professional_id and is_member(p.business_id)))
  with check (exists (select 1 from professionals p where p.id = professional_id and is_member(p.business_id)));

create policy "public read hours" on working_hours for select using (true);
create policy "members write hours" on working_hours for all
  using (exists (select 1 from professionals p where p.id = professional_id and is_member(p.business_id)))
  with check (exists (select 1 from professionals p where p.id = professional_id and is_member(p.business_id)));

-- datos privados: solo miembros del negocio
create policy "members clients" on clients for all
  using (is_member(business_id)) with check (is_member(business_id));
create policy "members appointments" on appointments for all
  using (is_member(business_id)) with check (is_member(business_id));
create policy "members products" on products for all
  using (is_member(business_id)) with check (is_member(business_id));
create policy "members stock" on stock_movements for all
  using (is_member(business_id)) with check (is_member(business_id));
create policy "members documents" on documents for all
  using (is_member(business_id)) with check (is_member(business_id));
create policy "members document items" on document_items for all
  using (exists (select 1 from documents d where d.id = document_id and is_member(d.business_id)))
  with check (exists (select 1 from documents d where d.id = document_id and is_member(d.business_id)));
