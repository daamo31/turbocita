# TurboCita

Citas online, inventario y facturación para peluquerías y negocios locales. Multi-negocio (cada negocio es un tenant) con página pública de reservas personalizable.

**Stack:** Next.js 16 (App Router) · React 19 · Supabase (Postgres, Auth, Storage, RLS) · Tailwind 4 · shadcn/ui · Vercel.

## Funcionalidades

- **Reservas públicas** en `/reservar/[slug]`: elección de uno o varios servicios (p. ej. corte + barba), profesional, fecha/hora y datos. Diseño pensado para móvil.
- **Panel** (`/dashboard`): agenda, servicios (crear, activar/desactivar, eliminar), equipo y horarios, inventario, facturación y presupuestos con PDF, fidelización y apariencia (tema, logo, colores, dominio propio).
- **Fidelización** (`/dashboard/fidelizacion`): programa de sellos con niveles de descuento (hasta 100 % = gratis), por servicio o general. Al completar una cita desde la agenda se suma un sello y se pueden canjear recompensas. Al reservar, el cliente ve sus sellos escribiendo solo su teléfono (sin cuenta ni correo; solo se muestran contadores, con límite de peticiones). Opcionalmente puede ver el detalle completo en `/mi-tarjeta` con un enlace por email.
- **Notificaciones** opcionales por SMS/WhatsApp (Twilio) y archivo `.ics` para añadir la cita al calendario.
- **Multi-tenant** con RLS: cada negocio solo ve sus datos. Subdominios `slug.tudominio.com` y dominios propios.

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # rellena las variables
npm run dev                  # http://localhost:3000
```

### Variables de entorno

| Variable | Obligatoria | Uso |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sí | Clave pública (anon) |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí | Clave de servicio. Solo servidor, nunca con prefijo `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_ROOT_DOMAIN` | No | Dominio base para subdominios `slug.dominio.com` |
| `NEXT_PUBLIC_SITE_URL` | No | URL pública del sitio |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` | No | Notificaciones. `TWILIO_FROM=whatsapp:+14155238886` para WhatsApp |
| `NOTIFY_ALLOWED_PREFIXES` | No | Prefijos telefónicos permitidos para notificaciones (por defecto `+34`) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | No | CAPTCHA Cloudflare Turnstile en reservas. Sin ellas, desactivado |
| `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` | No | Registrar dominios propios en Vercel automáticamente |

## Base de datos y migraciones

Las migraciones están en [supabase/migrations](supabase/migrations) (`0001` a `0015`). Usan la Supabase CLI, ya incluida como dependencia de desarrollo.

```bash
# Con sesión iniciada (npx supabase login) y proyecto enlazado
npx supabase link --project-ref <ref>
npx supabase db push

# O directamente con la cadena de conexión (pooler, compatible con IPv4)
npx supabase db push --db-url "postgresql://postgres.<ref>:<PASSWORD>@aws-0-<region>.pooler.supabase.com:5432/postgres"
```

Codifica los caracteres especiales de la contraseña en la URL (`%` → `%25`, `/` → `%2F`). Para crear una nueva migración: `npx supabase migration new nombre`.

## Seguridad

- RLS en todas las tablas; las funciones sensibles (`create_public_booking`, `check_rate_limit`) solo las ejecuta `service_role`.
- Reservas públicas con límite de peticiones por IP y por teléfono, CAPTCHA opcional y notificaciones restringidas a prefijos permitidos.
- Los datos de `businesses` que afectan a la identidad (`slug`, `custom_domain`, `logo_url`) solo se escriben desde el servidor tras validar al dueño.
- Triggers que impiden referenciar datos de otro negocio.
- Nunca subas `.env*` a git (ya está en `.gitignore`).

## Despliegue en Vercel

1. Importa el repositorio. **Framework Preset: Next.js**, Root Directory vacío.
2. Añade las variables de entorno de la tabla anterior.
3. Aplica las migraciones en Supabase antes del primer uso.

## Scripts

`npm run dev` · `npm run build` · `npm run start` · `npm run lint`
