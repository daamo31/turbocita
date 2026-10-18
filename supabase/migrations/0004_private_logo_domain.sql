-- 1) Datos fiscales privados fuera de la tabla pública `businesses`
create table business_private (
  business_id uuid primary key references businesses(id) on delete cascade,
  tax_id text,
  email text
);
insert into business_private (business_id, tax_id, email)
  select id, tax_id, email from businesses;
alter table businesses drop column tax_id, drop column email;

alter table business_private enable row level security;
create policy "members read private" on business_private for select using (is_member(business_id));
create policy "owner write private" on business_private for all
  using (is_owner(business_id)) with check (is_owner(business_id));

-- 2) Logo (Supabase Storage) y dominio propio
alter table businesses
  add column logo_url text,
  add column custom_domain text
    check (custom_domain ~ '^([a-z0-9-]+\.)+[a-z]{2,}$');
create unique index businesses_custom_domain_key on businesses (lower(custom_domain));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- Solo el dueño escribe en la carpeta de su negocio: logos/<business_id>/...
create policy "owner uploads logo" on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and is_owner(
    case when (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$' then (storage.foldername(name))[1]::uuid end));
create policy "owner updates logo" on storage.objects for update to authenticated
  using (bucket_id = 'logos' and is_owner(
    case when (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$' then (storage.foldername(name))[1]::uuid end));
create policy "owner deletes logo" on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and is_owner(
    case when (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$' then (storage.foldername(name))[1]::uuid end));
