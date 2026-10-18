"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getContext } from "@/lib/auth";

const itemsSchema = z.array(z.object({
  description: z.string().trim().min(1).max(200),
  quantity: z.number().positive().max(100000),
  unit_price: z.number().min(0).max(1_000_000),
})).min(1).max(100);

const schema = z.object({
  type: z.enum(["quote", "invoice"]),
  clientId: z.string().uuid().optional().or(z.literal("")),
  newName: z.string().trim().max(80).optional(),
  newPhone: z.string().trim().max(20).optional(),
  taxRate: z.coerce.number().min(0).max(100),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional(),
});

export async function createDocument(formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  let items;
  try { items = itemsSchema.parse(JSON.parse(String(formData.get("items") ?? "[]"))); } catch { items = null; }
  if (!parsed.success || !items) redirect("/dashboard/facturacion/nuevo?error=Datos+no+válidos");
  const d = parsed.data!;

  const { supabase, business } = await getContext();
  let clientId = d.clientId || null;
  if (!clientId && d.newName && d.newPhone) {
    const { data } = await supabase.from("clients")
      .upsert({ business_id: business.id, name: d.newName, phone: d.newPhone }, { onConflict: "business_id,phone" })
      .select("id").single();
    clientId = data?.id ?? null;
  }

  const { data: id, error } = await supabase.rpc("create_document", {
    p_business: business.id, p_type: d.type, p_client: clientId, p_tax_rate: d.taxRate,
    p_due: d.dueDate || null, p_notes: d.notes || null, p_items: items,
  });
  if (error || !id) redirect("/dashboard/facturacion/nuevo?error=No+se+pudo+crear+el+documento");
  revalidatePath("/dashboard/facturacion");
  redirect(`/dashboard/facturacion/${id}`);
}

export async function setDocumentStatus(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const status = z.enum(["pending", "paid", "cancelled"]).parse(formData.get("status"));
  const { supabase } = await getContext();
  await supabase.from("documents").update({ status }).eq("id", id);
  revalidatePath(`/dashboard/facturacion/${id}`);
  revalidatePath("/dashboard/facturacion");
}
