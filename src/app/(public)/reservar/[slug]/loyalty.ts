"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

export type LoyaltyStatus = {
  currentStamps: number;
  rewardsAvailable: number;
  upcoming: number;
  nextStamps: number | null;
  nextDescription: string | null;
  maxStamps: number;
} | null;

const schema = z.object({
  businessId: z.string().uuid(),
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/),
});

// Consulta de sellos por teléfono: solo devuelve contadores, con límite de peticiones por IP.
export async function getLoyaltyStatus(input: z.input<typeof schema>): Promise<LoyaltyStatus> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return null;

  const h = await headers();
  const ip = (h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0] ?? "unknown").trim();
  const db = createAdminClient();
  const { data: allowed } = await db.rpc("check_rate_limit", { p_key: `loyalty:${ip}`, p_max: 30, p_window: "1 hour" });
  if (allowed !== true) return null;

  const { data } = await db
    .rpc("loyalty_status_by_phone", { p_business: parsed.data.businessId, p_phone: parsed.data.phone })
    .maybeSingle<{ current_stamps: number; rewards_available: number; upcoming: number; next_stamps: number | null; next_description: string | null; max_stamps: number }>();
  if (!data) return null;
  return {
    currentStamps: data.current_stamps,
    rewardsAvailable: data.rewards_available,
    upcoming: data.upcoming,
    nextStamps: data.next_stamps,
    nextDescription: data.next_description,
    maxStamps: data.max_stamps,
  };
}
