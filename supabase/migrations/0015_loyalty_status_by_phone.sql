-- Estado de fidelización por teléfono, para mostrarlo en la reserva sin cuenta ni correo.
-- Solo devuelve contadores (sin nombre ni email). Ejecutable únicamente por service_role
-- desde un Server Action con límite de peticiones.
create or replace function loyalty_status_by_phone(p_business uuid, p_phone text)
returns table (
  current_stamps int, rewards_available int,
  next_stamps int, next_description text, max_stamps int
)
language sql stable security definer set search_path = public as $$
  with prog as (
    select id from loyalty_programs where business_id = p_business and is_active
  ),
  card as (
    select c.current_stamps, c.rewards_available
    from client_loyalty_cards c
    join clients cl on cl.id = c.client_id
    join prog on prog.id = c.program_id
    where cl.business_id = p_business
      and length(regexp_replace(p_phone, '\D', '', 'g')) >= 7
      and regexp_replace(cl.phone, '\D', '', 'g') = regexp_replace(p_phone, '\D', '', 'g')
    limit 1
  ),
  cur as (select coalesce((select current_stamps from card), 0) as stamps)
  select
    cur.stamps,
    coalesce((select rewards_available from card), 0),
    (select t.stamps from loyalty_tiers t join prog on prog.id = t.program_id
      where t.stamps > cur.stamps order by t.stamps limit 1),
    (select t.description from loyalty_tiers t join prog on prog.id = t.program_id
      where t.stamps > cur.stamps order by t.stamps limit 1),
    (select max(t.stamps) from loyalty_tiers t join prog on prog.id = t.program_id)
  from cur
  where exists (select 1 from prog);
$$;

revoke all on function loyalty_status_by_phone from public, anon, authenticated;
grant execute on function loyalty_status_by_phone to service_role;
