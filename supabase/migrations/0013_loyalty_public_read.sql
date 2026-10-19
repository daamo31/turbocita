-- La página pública de reservas muestra el programa de fidelización activo (sin datos de clientes).
create policy "public read active programs" on loyalty_programs for select using (is_active);
create policy "public read tiers of active programs" on loyalty_tiers for select
  using (exists (select 1 from loyalty_programs p where p.id = program_id and p.is_active));
