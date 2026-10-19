"use server";

import { z } from "zod";
import { TZDate } from "@date-fns/tz";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  businessId: z.string().uuid(),
  serviceIds: z.array(z.string().uuid()).min(1).max(10),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type Slot = { iso: string; label: string };
const STEP_MIN = 15;

// Huecos con al menos un profesional libre en un día (la capacidad es el nº de profesionales activos), calculados en la zona horaria del negocio.
export async function getAvailableSlots(input: z.input<typeof schema>): Promise<Slot[]> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return [];
  const { businessId, date } = parsed.data;
  const serviceIds = [...new Set(parsed.data.serviceIds)];

  const db = createAdminClient();
  const [{ data: biz }, { data: services }, { data: pros }] = await Promise.all([
    db.from("businesses").select("timezone").eq("id", businessId).single(),
    db.from("services").select("duration_min").in("id", serviceIds).eq("business_id", businessId).eq("active", true),
    db.from("professionals").select("id").eq("business_id", businessId).eq("active", true),
  ]);
  if (!biz || services?.length !== serviceIds.length || !pros?.length) return [];
  const proIds = pros.map((p) => p.id);
  const totalMin = services.reduce((sum, s) => sum + s.duration_min, 0);

  const tz = biz.timezone;
  const [y, m, d] = date.split("-").map(Number);
  const dayStart = new TZDate(y, m - 1, d, 0, 0, 0, tz);
  const dayEnd = new TZDate(y, m - 1, d + 1, 0, 0, 0, tz);

  const [{ data: hours }, { data: busy }] = await Promise.all([
    db.from("working_hours").select("professional_id, start_time, end_time").in("professional_id", proIds).eq("weekday", dayStart.getDay()),
    db.from("appointments").select("professional_id, starts_at, ends_at").in("professional_id", proIds)
      .in("status", ["pending", "confirmed"]).lt("starts_at", dayEnd.toISOString()).gt("ends_at", dayStart.toISOString()),
  ]);

  const now = Date.now();
  const durationMs = totalMin * 60_000;
  const found = new Map<string, Slot>();

  for (const pid of proIds) {
    const busyRanges = (busy ?? []).filter((b) => b.professional_id === pid).map((b) => [new Date(b.starts_at).getTime(), new Date(b.ends_at).getTime()]);
    for (const h of (hours ?? []).filter((x) => x.professional_id === pid)) {
      const [sh, sm] = h.start_time.split(":").map(Number);
      const [eh, em] = h.end_time.split(":").map(Number);
      for (let min = sh * 60 + sm; min + totalMin <= eh * 60 + em; min += STEP_MIN) {
        const start = new TZDate(y, m - 1, d, Math.floor(min / 60), min % 60, 0, tz).getTime();
        const end = start + durationMs;
        if (start <= now) continue;
        if (busyRanges.some(([bs, be]) => start < be && end > bs)) continue;
        const iso = new Date(start).toISOString();
        if (!found.has(iso)) found.set(iso, { iso, label: `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}` });
      }
    }
  }
  const slots = [...found.values()];
  return slots.sort((a, b) => a.iso.localeCompare(b.iso));
}
