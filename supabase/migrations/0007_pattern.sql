-- Decoración de fondo de la página pública ('auto' = la de la plantilla, 'none' = ninguna)
alter table businesses add column pattern text not null default 'auto';
