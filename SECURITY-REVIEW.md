# Auditoría de seguridad

Fecha: 2026-10-18. Alcance: todo el código de `src/` y `supabase/migrations/`.
Estado: **todos los hallazgos corregidos** (migración `0010_security_hardening.sql` y cambios en el código).

| # | Severidad | Ubicación | Hallazgo | Confianza | Estado |
|---|-----------|-----------|----------|-----------|--------|
| 1 | 🟠 HIGH | `lib/notifications/twilio.ts`, `reservar/[slug]/actions.ts` | Reserva pública sin CAPTCHA ni límite de peticiones: permitía enviar SMS/WhatsApp a cualquier número con texto libre, a cargo de la cuenta de Twilio. | 8/10 | Corregido |
| 2 | 🟡 MEDIUM | policy "owner update business" | Un dueño podía editar cualquier columna de su negocio vía API (`slug`, `custom_domain`, `logo_url`), saltándose las validaciones del servidor. | 8/10 | Corregido |
| 3 | 🟡 MEDIUM | policies de `appointments`, stock, `professional_services`, etc. | Las políticas RLS no comprobaban que las referencias (profesional, servicio, cliente, producto) fueran del mismo negocio. | 7/10 | Corregido |
| 4 | 🟡 MEDIUM | `create_public_booking` | Una reserva anónima sobrescribía nombre y email de un cliente existente con el mismo teléfono. | 7/10 | Corregido |
| 5 | ⚪ LOW | `api/reservas/[id]/ics/route.ts` | Escapado incompleto del `.ics` (`\r` suelto, sin plegado de líneas). | 6/10 | Corregido |

## Correcciones aplicadas

1. **Abuso de Twilio:** función `check_rate_limit` (10 reservas/hora por IP, 3/día por teléfono); notificaciones solo a prefijos permitidos (`NOTIFY_ALLOWED_PREFIXES`, por defecto `+34`); el mensaje ya no incluye texto del cliente; CAPTCHA Cloudflare Turnstile opcional.
2. **Columnas de `businesses`:** `revoke update` y `grant update` solo sobre columnas seguras. `slug`, `custom_domain` y `logo_url` se escriben desde el servidor con `service_role` tras comprobar que el usuario es el dueño. Se bloquean dominios de terceros (`vercel.app`, `supabase.co`).
3. **Referencias entre negocios:** triggers `enforce_same_business` en citas, servicios de cita, stock, documentos y líneas de documento.
4. **Datos de clientes:** el upsert conserva el nombre existente y solo rellena el email si estaba vacío.
5. **`.ics`:** se eliminan `\r` y caracteres de control y se pliegan las líneas a 75 octetos (RFC 5545).

## Verificado sin problemas

- `create_public_booking` y `check_rate_limit`: ejecución solo para `service_role`.
- Claves: `.env*` en `.gitignore`; la `service_role` nunca lleva prefijo `NEXT_PUBLIC_`.
- Acciones del panel y PDF: acceso limitado por RLS y sesión (sin IDOR).
- Sin XSS: no hay `dangerouslySetInnerHTML`; los temas salen de listas cerradas.
- Logos: tipos MIME permitidos, comprobación de firma del archivo y políticas de Storage por negocio.

## Riesgos residuales

- **Dominios propios:** el servidor no verifica la propiedad del dominio; depende de la verificación de Vercel al añadirlo al proyecto.
- **CAPTCHA:** solo está activo si se configuran `NEXT_PUBLIC_TURNSTILE_SITE_KEY` y `TURNSTILE_SECRET_KEY`.
- **Credenciales:** rotar cualquier clave o contraseña que se haya compartido fuera de los gestores de secretos.
