"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookingConfirmation } from "@/lib/notifications/twilio";

const bookingSchema = z.object({
  businessId: z.string().uuid(),
  serviceIds: z.string().transform((v) => v.split(",").filter(Boolean)).pipe(z.array(z.string().uuid()).min(1).max(10)),
  professionalId: z.string().uuid(),
  startsAt: z.string().datetime({ offset: true }), // ISO 8601 con zona horaria
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, "Teléfono no válido"),
  email: z.string().trim().email().optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional(),
});

// Cloudflare Turnstile (opcional): se exige solo si TURNSTILE_SECRET_KEY está configurada
async function captchaOk(token: string | undefined, ip: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    });
    return ((await res.json()) as { success?: boolean }).success === true;
  } catch {
    return false;
  }
}

export type BookingState =
  | { ok: true; appointmentId: string; cancelToken: string; endsAt: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> }
  | null;

const ERRORS: Record<string, string> = {
  slot_taken: "Ese hueco acaba de ser reservado. Elige otra hora.",
  invalid_service: "El servicio no está disponible.",
  invalid_professional: "Este profesional no ofrece ese servicio.",
  rate_limited: "Demasiados intentos. Inténtalo de nuevo más tarde.",
  captcha: "No se pudo verificar que eres una persona. Recarga la página e inténtalo de nuevo.",
  past_date: "La fecha debe ser futura.",
  outside_hours: "La hora está fuera del horario del profesional.",
};

// Compatible con useActionState(createBooking, null)
export async function createBooking(_prev: BookingState, formData: FormData): Promise<BookingState> {
  const parsed = bookingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Revisa los datos del formulario.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const d = parsed.data;

  const h = await headers();
  const ip = (h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0] ?? "unknown").trim();
  if (!(await captchaOk(String(formData.get("cf-turnstile-response") ?? ""), ip))) return { ok: false, error: ERRORS.captcha };

  const supabase = createAdminClient();
  const phoneKey = d.phone.replace(/[ ()-]/g, "");
  const [byIp, byPhone] = await Promise.all([
    supabase.rpc("check_rate_limit", { p_key: `ip:${ip}`, p_max: 10, p_window: "1 hour" }),
    supabase.rpc("check_rate_limit", { p_key: `phone:${phoneKey}`, p_max: 3, p_window: "1 day" }),
  ]);
  if (byIp.data !== true || byPhone.data !== true) return { ok: false, error: ERRORS.rate_limited };

  const { data, error } = await supabase
    .rpc("create_public_booking", {
      p_business: d.businessId,
      p_services: d.serviceIds,
      p_professional: d.professionalId,
      p_starts_at: d.startsAt,
      p_name: d.name,
      p_phone: d.phone,
      p_email: d.email || null,
      p_notes: d.notes || null,
    })
    .single<{ appointment_id: string; cancel_token: string; ends_at: string }>();

  if (error || !data) {
    const key = Object.keys(ERRORS).find((k) => error?.message.includes(k));
    if (!key) console.error("create_public_booking", error);
    return { ok: false, error: key ? ERRORS[key] : "No se pudo crear la reserva. Inténtalo de nuevo." };
  }

  // La notificación no debe romper una reserva ya creada
  try {
    const { data: biz } = await supabase.from("businesses").select("name, timezone").eq("id", d.businessId).single();
    if (biz) await sendBookingConfirmation({ to: d.phone, businessName: biz.name, startsAt: d.startsAt, timeZone: biz.timezone });
  } catch (e) {
    console.error("notification failed", e);
  }

  return { ok: true, appointmentId: data.appointment_id, cancelToken: data.cancel_token, endsAt: data.ends_at };
}
