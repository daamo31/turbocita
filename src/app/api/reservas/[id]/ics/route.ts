import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const esc = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r\n|\r|\n/g, "\\n")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
// RFC 5545: líneas de máx. 75 octetos, continuación con CRLF + espacio
const fold = (line: string) => {
  const out: string[] = [];
  let cur = "", bytes = 0;
  for (const ch of line) {
    const n = Buffer.byteLength(ch);
    if (bytes + n > (out.length ? 74 : 75)) { out.push(cur); cur = ""; bytes = 0; }
    cur += ch; bytes += n;
  }
  out.push(cur);
  return out.join("\r\n ");
};
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
    .select("id, starts_at, ends_at, services(name), appointment_services(name, position), professionals(name), businesses(name, address, phone)")
    .eq("id", id).eq("cancel_token", token!).maybeSingle();
  if (!a) return new Response("Not found", { status: 404 });

  const biz = a.businesses as unknown as { name: string; address: string | null; phone: string | null };
  const lines_ = a.appointment_services as { name: string; position: number }[] | null;
  const svc = lines_?.length
    ? [...lines_].sort((x, y) => x.position - y.position).map((x) => x.name).join(" + ")
    : (a.services as unknown as { name: string }).name;
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

  return new Response(lines.map(fold).join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="reserva-${a.id.slice(0, 8)}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
