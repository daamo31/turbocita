"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getContext } from "@/lib/auth";
import type { CompleteAppointmentResponse, CompleteAppointmentResult } from "@/types/loyalty";

const schema = z.object({
  id: z.string().uuid(),
  rewardId: z.string().uuid().nullish(),
});

// Completa la cita y suma el sello en una única transacción SQL (complete_appointment).
// La función valida que el usuario sea miembro del negocio, bloquea la cita (sin dobles sellos),
// desbloquea los niveles alcanzados y, si se indica rewardId, canjea esa recompensa.
export async function completeAppointment(input: { id: string; rewardId?: string | null }): Promise<CompleteAppointmentResponse> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos no válidos" };

  const { supabase } = await getContext();
  const { data, error } = await supabase.rpc("complete_appointment", {
    p_appointment: parsed.data.id,
    p_reward: parsed.data.rewardId ?? null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/agenda");
  revalidatePath("/dashboard/fidelizacion");
  return { ok: true, result: data as CompleteAppointmentResult };
}

const programSchema = z.object({
  service_id: z.union([z.string().uuid(), z.literal("")]).transform((v) => v || null),
  tiers: z
    .array(z.object({
      stamps: z.number().int().min(1).max(100),
      discount_percent: z.number().int().min(1).max(100),
      description: z.string().trim().max(160).optional(),
    }))
    .min(1).max(10)
    .refine((t) => new Set(t.map((x) => x.stamps)).size === t.length, "No repitas el número de sellos"),
});

// Guarda el programa activo y sus niveles de forma atómica (solo el dueño; se vuelve a comprobar en SQL).
export async function saveLoyaltyProgram(formData: FormData): Promise<void> {
  let tiers: unknown;
  try { tiers = JSON.parse(String(formData.get("tiers") ?? "[]")); } catch { return; }
  const parsed = programSchema.safeParse({ service_id: formData.get("service_id") ?? "", tiers });
  if (!parsed.success) return;
  const { supabase, business, role } = await getContext();
  if (role !== "owner") return;

  await supabase.rpc("save_loyalty_program", {
    p_business: business.id,
    p_service: parsed.data.service_id,
    p_tiers: parsed.data.tiers,
  });
  revalidatePath("/dashboard/fidelizacion");
}

export async function deactivateLoyaltyProgram(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const { supabase, role } = await getContext();
  if (role !== "owner") return;
  await supabase.from("loyalty_programs").update({ is_active: false }).eq("id", id);
  revalidatePath("/dashboard/fidelizacion");
}
