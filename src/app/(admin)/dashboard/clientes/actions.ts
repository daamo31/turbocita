"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getContext } from "@/lib/auth";

// Derecho de supresión: anonimiza al cliente y conserva las estadísticas de sus citas
export async function anonymizeClient(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const { supabase } = await getContext();
  const { error } = await supabase.rpc("anonymize_client", { p_client: id });
  if (error) {
    const msg = error.message.includes("has_invoices")
      ? "Este cliente tiene facturas emitidas: la ley obliga a conservarlas, así que no se puede anonimizar todavía."
      : "No se pudo anonimizar al cliente.";
    redirect("/dashboard/clientes?msg=" + encodeURIComponent(msg));
  }
  revalidatePath("/dashboard/clientes");
  redirect("/dashboard/clientes?msg=" + encodeURIComponent("Datos del cliente anonimizados."));
}
