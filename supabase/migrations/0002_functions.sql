-- Funciones atómicas para inventario y facturación

create or replace function adjust_stock(p_product uuid, p_delta int, p_reason text default null)
returns int language plpgsql as $$
declare v_business uuid; v_stock int;
begin
  -- RLS aplica: solo miembros del negocio pueden actualizar
  update products set stock = stock + p_delta
   where id = p_product
   returning business_id, stock into v_business, v_stock;
  if v_business is null then raise exception 'product_not_found'; end if;
  insert into stock_movements (product_id, business_id, delta, reason, created_by)
  values (p_product, v_business, p_delta, p_reason, auth.uid());
  return v_stock;
end $$;

create or replace function create_document(
  p_business uuid, p_type document_type, p_client uuid, p_tax_rate numeric,
  p_due date, p_notes text, p_items jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_number int; it jsonb;
begin
  if not is_member(p_business) then raise exception 'forbidden'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'no_items';
  end if;
  if p_client is not null and not exists
     (select 1 from clients where id = p_client and business_id = p_business) then
    raise exception 'invalid_client';
  end if;

  -- Serializa la numeración por negocio y tipo
  perform pg_advisory_xact_lock(hashtext(p_business::text || p_type::text));
  v_number := next_document_number(p_business, p_type);

  insert into documents (business_id, client_id, type, number, tax_rate, due_date, notes)
  values (p_business, p_client, p_type, v_number, p_tax_rate, p_due, p_notes)
  returning id into v_id;

  for it in select * from jsonb_array_elements(p_items) loop
    insert into document_items (document_id, description, quantity, unit_price)
    values (v_id, it->>'description', (it->>'quantity')::numeric, (it->>'unit_price')::numeric);
  end loop;
  return v_id;
end $$;

revoke all on function create_document from public, anon;
grant execute on function create_document to authenticated;
