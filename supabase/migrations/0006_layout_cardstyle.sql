-- Plantilla de diseño (estructura) y estilo de tarjetas de la página pública
alter table businesses
  add column layout text not null default 'classic',
  add column card_style text not null default 'auto';
