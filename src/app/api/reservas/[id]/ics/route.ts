import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

// Evento .ics para añadir la reserva al calendario/wallet del móvil. El token de cancelación actúa como secreto.
export async function GET(req: Request, ctx: RouteContext<"/api/reservas/[id]/ics">) {
  const { id } = await ctx.params;
  const token = new URL(req.url).searchParams.get("t");
  if (!z.string().uuid().safeParse(id).success || !z.string().uuid().safeParse(token).success) {
    return new Response("Not found", { status: 404 });
  }

  const { data: a } = await createAdminClient()
    .from("appointments")
    .select("id, starts_at, ends_at, services(name), professionals(name), businesses(name, address, phone)")
    .eq("id", id).eq("cancel_token", token!).maybeSingle();
  if (!a) return new Response("Not found", { status: 404 });

  const biz = a.businesses as unknown as { name: string; address: string | null; phone: string | null };
  const svc = (a.services as unknown as { name: string }).name;
  const pro = (a.professionals as unknown as { name: string }).name;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TurboCita//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${a.id}@turbocita`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(a.starts_at)}`,
    `DTEND:${stamp(a.ends_at)}`,
    `SUMMARY:${esc(`${svc} · ${biz.name}`)}`,
    `DESCRIPTION:${esc(`${svc} con ${pro}${biz.phone ? `\nTeléfono: ${biz.phone}` : ""}`)}`,
    ...(biz.address ? [`LOCATION:${esc(biz.address)}`] : []),
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(`Tu cita en ${biz.name} es en 1 hora`)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return new Response(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="reserva-${a.id.slice(0, 8)}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
