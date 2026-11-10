-- La prueba de TurboCita es independiente de las pruebas de Stripe.
alter table businesses
  add column app_trial_ends_at timestamptz not null default (now() + interval '15 days');

-- Las cuentas existentes sin suscripción vigente reciben 15 días desde la migración.
update businesses set app_trial_ends_at = now() + interval '15 days'
where stripe_subscription_id is null or plan_status = 'canceled';

-- Las cuentas con suscripción no recuperan una prueba al cancelar o tener un impago.
update businesses set app_trial_ends_at = now()
where stripe_subscription_id is not null and plan_status <> 'canceled';

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
  select created_at into strict v_created_at from auth.users where id = auth.uid();
  insert into businesses (name, slug, app_trial_ends_at)
    values (p_name, p_slug, v_created_at + interval '15 days') returning id into b;
  insert into business_members (business_id, user_id, role) values (b, auth.uid(), 'owner');
  return b;
end $$;

create or replace function business_has_access(p_business uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select b.app_trial_ends_at > now()
      or (b.stripe_subscription_id is not null and b.plan_status = 'active')
      or (b.stripe_subscription_id is not null and b.plan_status = 'trialing'
          and b.trial_ends_at is not null and b.trial_ends_at > now())
    from businesses b where b.id = p_business
  ), false);
$$;
revoke all on function business_has_access(uuid) from public, anon;
grant execute on function business_has_access(uuid) to authenticated, service_role;

create or replace function effective_plan(p_business uuid)
returns text language sql stable security definer set search_path = public as $$
  select case
    when app_trial_ends_at > now() then 'pro'
    when stripe_subscription_id is not null and plan_status = 'active' then plan
    when stripe_subscription_id is not null and plan_status = 'trialing'
         and trial_ends_at is not null and trial_ends_at > now() then plan
    else 'starter'
  end from businesses where id = p_business
$$;

create or replace function is_member(b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select business_has_access(b)
    and exists (select 1 from business_members where business_id = b and user_id = auth.uid());
$$;

create or replace function is_owner(b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select business_has_access(b)
    and exists (select 1 from business_members
                where business_id = b and user_id = auth.uid() and role = 'owner');
$$;
