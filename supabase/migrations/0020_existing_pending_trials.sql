-- También concede la prueba a cuentas registradas antes de la activación que
-- todavía no habían confirmado su correo ni creado su negocio.
create table subscription_policy (
  id boolean primary key default true check (id),
  activated_at timestamptz not null default now()
);
alter table subscription_policy enable row level security;
revoke all on subscription_policy from public, anon, authenticated;
insert into subscription_policy default values;

create or replace function create_business(p_name text, p_slug text)
returns uuid language plpgsql security definer set search_path = public as $$
declare b uuid; v_created_at timestamptz;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_slug !~ '^[a-z0-9]([a-z0-9-]{1,38})[a-z0-9]$' then raise exception 'invalid_slug'; end if;
  if p_slug in ('www','app','admin','api','login','registro','dashboard','reservar','mail','smtp',
                'ftp','cdn','static','assets','blog','help','ayuda','soporte','support','status',
                'docs','dev','test','staging','demo','turbocita','billing','factura','pagos') then
    raise exception 'reserved_slug';
  end if;
  select greatest(u.created_at, p.activated_at) into strict v_created_at
    from auth.users u cross join subscription_policy p
    where u.id = auth.uid() and p.id;
  insert into businesses (name, slug, app_trial_ends_at)
    values (p_name, p_slug, v_created_at + interval '15 days') returning id into b;
  insert into business_members (business_id, user_id, role) values (b, auth.uid(), 'owner');
  return b;
end $$;
