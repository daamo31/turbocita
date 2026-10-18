"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getContext } from "@/lib/auth";

const time = z.string().regex(/^\d{2}:\d{2}$/);
const scheduleSchema = z.record(
  z.string().regex(/^[0-6]$/),
  z.array(z.object({ start: time, end: time })).max(3)
);

// Convierte el horario del editor en filas de working_hours; descarta tramos no válidos y solapados
function toRows(professional_id: string, raw: unknown) {
  let json: unknown;
  try { json = JSON.parse(String(raw ?? "{}")); } catch { return null; }
  const parsed = scheduleSchema.safeParse(json);
  if (!parsed.success) return null;

  const rows: { professional_id: string; weekday: number; start_time: string; end_time: string }[] = [];
  for (const [day, ranges] of Object.entries(parsed.data)) {
    const sorted = [...ranges].sort((x, y) => x.start.localeCompare(y.start));
    for (let i = 0; i < sorted.length; i++) {
      const r = sorted[i];
      if (r.end <= r.start) return null;
      if (i > 0 && r.start < sorted[i - 1].end) return null; // tramos solapados
      rows.push({ professional_id, weekday: Number(day), start_time: r.start, end_time: r.end });
    }
  }
  return rows;
}

export async function createProfessional(formData: FormData) {
  const name = z.string().trim().min(2).max(80).safeParse(formData.get("name"));
  if (!name.success) return;
  const serviceIds = z.array(z.string().uuid()).parse(formData.getAll("services"));

  const { supabase, business } = await getContext();
  // Validamos el horario antes de crear nada
  const rows = toRows("00000000-0000-0000-0000-000000000000", formData.get("schedule"));
  if (!rows) return;

  const { data: pro, error } = await supabase
    .from("professionals").insert({ business_id: business.id, name: name.data }).select("id").single();
  if (error || !pro) return;

  if (serviceIds.length)
    await supabase.from("professional_services").insert(serviceIds.map((service_id) => ({ professional_id: pro.id, service_id })));
  if (rows.length)
    await supabase.from("working_hours").insert(rows.map((r) => ({ ...r, professional_id: pro.id })));
  revalidatePath("/dashboard/equipo");
}

// Horario general del negocio (solo dueño): plantilla para nuevos profesionales
export async function saveBusinessSchedule(formData: FormData) {
  const rows = toRows("x", formData.get("schedule")); // misma validación; el id no se usa
  if (!rows) return;
  const { supabase, business, role } = await getContext();
  if (role !== "owner") return;
  const schedule: Record<string, { start: string; end: string }[]> = {};
  for (const r of rows) (schedule[r.weekday] ??= []).push({ start: r.start_time, end: r.end_time });
  await supabase.from("businesses").update({ default_schedule: schedule }).eq("id", business.id);
  revalidatePath("/dashboard/equipo");
}

// Sustituye por completo el horario de un profesional (RLS limita a su negocio)
export async function saveSchedule(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const rows = toRows(id, formData.get("schedule"));
  if (!rows) return;
  const { supabase } = await getContext();
  const { error: delErr } = await supabase.from("working_hours").delete().eq("professional_id", id);
  if (delErr) return;
  if (rows.length) await supabase.from("working_hours").insert(rows);
  revalidatePath("/dashboard/equipo");
}

export async function toggleProfessional(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const { supabase } = await getContext();
  await supabase.from("professionals").update({ active: formData.get("active") === "true" }).eq("id", id);
  revalidatePath("/dashboard/equipo");
}
