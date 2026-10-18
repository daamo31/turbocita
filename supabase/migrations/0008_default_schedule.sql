-- Horario general del negocio: plantilla que se copia al crear profesionales
-- Formato: {"1":[{"start":"09:00","end":"14:00"}], ...} (0 = domingo)
alter table businesses add column default_schedule jsonb not null default '{}'::jsonb;
