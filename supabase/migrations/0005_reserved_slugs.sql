-- Slugs reservados también a nivel de base de datos
create or replace function create_business(p_name text, p_slug text)
returns uuid language plpgsql security definer set search_path = public as $$
declare b uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_slug !~ '^[a-z0-9]([a-z0-9-]{1,38})[a-z0-9]$' then raise exception 'invalid_slug'; end if;
  if p_slug in ('www','app','admin','api','login','registro','dashboard','reservar','mail','smtp',
                'ftp','cdn','static','assets','blog','help','ayuda','soporte','support','status',
                'docs','dev','test','staging','demo','turbocita','billing','factura','pagos') then
    raise exception 'reserved_slug';
  end if;
  insert into businesses (name, slug) values (p_name, p_slug) returning id into b;
  insert into business_members (business_id, user_id, role) values (b, auth.uid(), 'owner');
  return b;
end $$;
