-- Personalización de la página pública de reservas
alter table businesses
  add column theme text not null default 'classic',
  add column brand_color text check (brand_color ~ '^#[0-9a-fA-F]{6}$'),
  add column tagline text check (char_length(tagline) <= 120),
  add column description text check (char_length(description) <= 400);
