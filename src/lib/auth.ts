import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Devuelve cliente, usuario y negocio activo; crea el negocio en el primer acceso
// si el registro guardó sus datos en user_metadata (caso de confirmación por email).
export async function getContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const query = () =>
    supabase
      .from("business_members")
      .select("role, businesses(id, name, slug, currency, timezone, phone, address, logo_url)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

  let { data: member } = await query();

  if (!member) {
    const meta = user.user_metadata as { business_name?: string; business_slug?: string };
    if (!meta.business_name || !meta.business_slug) redirect("/login?error=Sin negocio asociado");
    const { error } = await supabase.rpc("create_business", {
      p_name: meta.business_name,
      p_slug: meta.business_slug,
    });
    if (error) redirect("/login?error=" + encodeURIComponent("No se pudo crear el negocio (¿slug en uso?)"));
    ({ data: member } = await query());
  }

  const business = member!.businesses as unknown as {
    id: string; name: string; slug: string; currency: string; timezone: string;
    phone: string | null; address: string | null; logo_url: string | null;
  };
  return { supabase, user, business, role: member!.role as "owner" | "employee" };
}
