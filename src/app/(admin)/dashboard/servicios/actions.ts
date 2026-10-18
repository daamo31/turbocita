"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getContext } from "@/lib/auth";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  duration_min: z.coerce.number().int().min(5).max(600),
  price: z.coerce.number().min(0).max(100000),
});

export async function createService(formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const { supabase, business } = await getContext();
  await supabase.from("services").insert({ ...parsed.data, business_id: business.id });
  revalidatePath("/dashboard/servicios");
}

export async function toggleService(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const active = formData.get("active") === "true";
  const { supabase } = await getContext();
  await supabase.from("services").update({ active }).eq("id", id);
  revalidatePath("/dashboard/servicios");
}

// Si el servicio ya tiene citas no se puede borrar (historial): se desactiva en su lugar.
export async function deleteService(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const { supabase } = await getContext();
  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error?.code === "23503") await supabase.from("services").update({ active: false }).eq("id", id);
  revalidatePath("/dashboard/servicios");
}
