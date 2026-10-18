"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getContext } from "@/lib/auth";

export async function createProduct(formData: FormData) {
  const parsed = z.object({
    name: z.string().trim().min(2).max(80),
    sku: z.string().trim().max(40).optional(),
    price: z.coerce.number().min(0).max(100000),
    stock: z.coerce.number().int().min(0).max(1_000_000),
    min_stock: z.coerce.number().int().min(0).max(1_000_000),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const { supabase, business } = await getContext();
  await supabase.from("products").insert({ ...parsed.data, sku: parsed.data.sku || null, business_id: business.id });
  revalidatePath("/dashboard/inventario");
}

export async function adjustStock(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const delta = z.coerce.number().int().min(-100000).max(100000).parse(formData.get("delta"));
  if (delta === 0) return;
  const { supabase } = await getContext();
  await supabase.rpc("adjust_stock", { p_product: id, p_delta: delta, p_reason: "Ajuste manual" });
  revalidatePath("/dashboard/inventario");
}
