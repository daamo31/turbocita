"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
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

type Rows = { professional_id: string; weekday: number; start_time: string; end_time: string }[];

// Horario general del negocio → se copia a todos los puestos (son intercambiables)
async function applySchedule(supabase: SupabaseClient, proIds: string[], schedule: Record<string, { start: string; end: string }[]>) {
  if (!proIds.length) return;
  await supabase.from("working_hours").delete().in("professional_id", proIds);
  const rows: Rows = proIds.flatMap((id) =>
    Object.entries(schedule).flatMap(([day, ranges]) =>
      ranges.map((r) => ({ professional_id: id, weekday: Number(day), start_time: r.start, end_time: r.end }))));
  if (rows.length) await supabase.from("working_hours").insert(rows);
}

// Horario del negocio (solo dueño): se aplica a todos los profesionales actuales y futuros
export async function saveBusinessSchedule(formData: FormData) {
  const rows = toRows("x", formData.get("schedule")); // misma validación; el id no se usa
  if (!rows) return { ok: false, error: "Horario no válido: revisa que los tramos no se solapen." };
  const { supabase, business, role } = await getContext();
  if (role !== "owner") return { ok: false, error: "Solo el dueño puede cambiar el horario." };
  const schedule: Record<string, { start: string; end: string }[]> = {};
  for (const r of rows) (schedule[r.weekday] ??= []).push({ start: r.start_time, end: r.end_time });
  await supabase.from("businesses").update({ default_schedule: schedule }).eq("id", business.id);
  const { data: pros } = await supabase.from("professionals").select("id").eq("business_id", business.id);
  await applySchedule(supabase, (pros ?? []).map((p) => p.id), schedule);
  revalidatePath("/dashboard/equipo");
}

// +1 profesional: reactiva un puesto antiguo si lo hay, si no crea "Profesional N"
export async function addProfessional() {
  const { supabase, business } = await getContext();
  const { data: all } = await supabase.from("professionals").select("id, active").eq("business_id", business.id).order("created_at");
  if ((all ?? []).filter((p) => p.active).length >= 50) return { ok: false, error: "Has alcanzado el máximo de 50 profesionales." };
  const old = (all ?? []).find((p) => !p.active);
  if (old) {
    await supabase.from("professionals").update({ active: true }).eq("id", old.id);
  } else {
    const { data: pro } = await supabase.from("professionals")
      .insert({ business_id: business.id, name: `Profesional ${(all?.length ?? 0) + 1}` }).select("id").single();
    const { data: biz } = await supabase.from("businesses").select("default_schedule").eq("id", business.id).single();
    if (pro) await applySchedule(supabase, [pro.id], (biz?.default_schedule ?? {}) as Record<string, { start: string; end: string }[]>);
  }
  revalidatePath("/dashboard/equipo");
}

// -1 profesional: desactiva el último puesto activo (se conserva el historial de citas y se reutiliza al añadir)
export async function removeProfessional() {
  const { supabase, business } = await getContext();
  const { data: active } = await supabase.from("professionals").select("id").eq("business_id", business.id).eq("active", true).order("created_at", { ascending: false });
  if (!active || active.length <= 1) return { ok: false, error: "Debe quedar al menos un profesional." };
  await supabase.from("professionals").update({ active: false }).eq("id", active[0].id);
  revalidatePath("/dashboard/equipo");
}
