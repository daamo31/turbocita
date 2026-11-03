-- Planes de suscripción: starter / growth / pro
-- Las columnas de plan NO están en el GRANT de update de 0010: solo las cambia service_role (webhook de pago o soporte).
alter table businesses
  add column if not exists plan text not null default 'starter' check (plan in ('starter', 'growth', 'pro')),
  add column if not exists billing_interval text not null default 'month' check (billing_interval in ('month', 'year')),
  add column if not exists plan_status text not null default 'active' check (plan_status in ('trialing', 'active', 'past_due', 'canceled')),
  add column if not exists trial_ends_at timestamptz,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

-- Negocios que ya existían: se mantienen con todas las funciones
update businesses set plan = 'pro' where created_at < now() and plan = 'starter';

-- Plan efectivo: un plan cancelado o con la prueba vencida vuelve a starter
create or replace function effective_plan(p_business uuid)
returns text language sql stable security definer set search_path = public as $$
  select case
    when plan_status = 'canceled' then 'starter'
    when plan_status = 'trialing' and trial_ends_at is not null and trial_ends_at < now() then 'starter'
    else plan
  end from businesses where id = p_business
$$;
revoke all on function effective_plan from public, anon;
grant execute on function effective_plan to authenticated, service_role;

create or replace function plan_max_professionals(p_plan text)
returns int language sql immutable as $$
  select case p_plan when 'starter' then 1 when 'growth' then 5 else 50 end
$$;

-- Límite de profesionales activos por plan (defensa en profundidad: la app también lo comprueba)
create or replace function enforce_professional_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  if not new.active then return new; end if;
  select count(*) into v_count from professionals
    where business_id = new.business_id and active and id <> new.id;
  if v_count + 1 > plan_max_professionals(effective_plan(new.business_id)) then
    raise exception 'plan_limit_professionals';
  end if;
  return new;
end $$;

drop trigger if exists professionals_plan_limit on professionals;
create trigger professionals_plan_limit
  before insert or update of active on professionals
  for each row execute function enforce_professional_limit();
