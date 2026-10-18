"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getContext } from "@/lib/auth";

const statuses = ["pending", "confirmed", "completed", "cancelled", "no_show"] as const;

export async function setAppointmentStatus(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const status = z.enum(statuses).parse(formData.get("status"));
  const { supabase } = await getContext();
  await supabase.from("appointments").update({ status }).eq("id", id); // RLS limita al negocio
  revalidatePath("/dashboard/agenda");
}
