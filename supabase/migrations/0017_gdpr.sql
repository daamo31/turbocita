-- RGPD: registro de consentimiento y anonimización de clientes (derecho de supresión).

alter table clients
  add column if not exists privacy_consent_at timestamptz,
  add column if not exists privacy_consent_version text,
  add column if not exists anonymized_at timestamptz;

-- Un cliente anonimizado no debe poder coincidir con un teléfono real
drop index if exists clients_phone_key_idx;
alter table clients drop column if exists phone_key;
alter table clients add column phone_key text
  generated always as (case when anonymized_at is null then right(regexp_replace(phone, '\D', '', 'g'), 9) end) stored;
create index clients_phone_key_idx on clients (business_id, phone_key);

-- Anonimiza a un cliente: borra nombre, teléfono, email, notas y vínculo con cuenta,
-- pero conserva citas (fecha, servicios e importe) para las estadísticas del negocio.
-- No se permite si tiene facturas emitidas: la ley obliga a conservarlas.
create or replace function anonymize_client(p_client uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_business uuid;
begin
  select business_id into v_business from clients where id = p_client;
  if v_business is null or not is_member(v_business) then raise exception 'Cliente no encontrado'; end if;

  if exists (select 1 from documents where client_id = p_client and type = 'invoice') then
    raise exception 'has_invoices';
  end if;

  update appointments set notes = null where client_id = p_client;
  update documents set notes = null where client_id = p_client;
  delete from client_loyalty_cards where client_id = p_client;
  update clients set
    name = 'Cliente anonimizado',
    phone = 'anon-' || id::text,
    email = null,
    notes = null,
    auth_user_id = null,
    anonymized_at = now()
  where id = p_client;
end $$;

revoke all on function anonymize_client from public, anon;
grant execute on function anonymize_client to authenticated;
