"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getContext } from "@/lib/auth";

const time = z.string().regex(/^\d{2}:\d{2}$/);

export async function createProfessional(formData: FormData) {
  const parsed = z.object({
    name: z.string().trim().min(2).max(80),
    start: time,
    end: time,
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success || parsed.data.end <= parsed.data.start) return;

  const serviceIds = z.array(z.string().uuid()).parse(formData.getAll("services"));
  const days = z.array(z.coerce.number().int().min(0).max(6)).parse(formData.getAll("days"));

  const { supabase, business } = await getContext();
  const { data: pro, error } = await supabase
    .from("professionals").insert({ business_id: business.id, name: parsed.data.name }).select("id").single();
  if (error || !pro) return;

  if (serviceIds.length)
    await supabase.from("professional_services").insert(serviceIds.map((service_id) => ({ professional_id: pro.id, service_id })));
  if (days.length)
    await supabase.from("working_hours").insert(
      days.map((weekday) => ({ professional_id: pro.id, weekday, start_time: parsed.data.start, end_time: parsed.data.end }))
    );
  revalidatePath("/dashboard/equipo");
}

export async function toggleProfessional(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const { supabase } = await getContext();
  await supabase.from("professionals").update({ active: formData.get("active") === "true" }).eq("id", id);
  revalidatePath("/dashboard/equipo");
}
