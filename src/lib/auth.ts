import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parsePlan } from "@/lib/plans";

// Devuelve cliente, usuario y negocio activo; crea el negocio en el primer acceso
// si el registro guardó sus datos en user_metadata (caso de confirmación por email).
// cache() evita que layout y página lo ejecuten dos veces (y dos create_business) en la misma petición.
export const getBillingContext = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const query = () =>
    supabase
      .from("business_members")
      .select("role, businesses(id, name, slug, currency, timezone, phone, address, logo_url, app_trial_ends_at)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

  let { data: member } = await query();

  if (!member) {
    const meta = user.user_metadata as { business_name?: string; business_slug?: string };
    if (!meta.business_name || !meta.business_slug) {
      redirect("/login?error=" + encodeURIComponent("Sin negocio asociado"));
    }
    
    // Intenta crear el negocio. Si falla por slug único, espera un poco e intenta nuevamente
    let created = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { error } = await supabase.rpc("create_business", {
        p_name: meta.business_name,
        p_slug: meta.business_slug,
      });
      
      if (!error) {
        created = true;
        break;
      }
      
      // Si no es error de slug duplicado o es el último intento, falla
      if (attempt === 2 || !error.message.includes("unique")) {
        redirect("/login?error=" + encodeURIComponent(error.message || "No se pudo crear el negocio"));
      }
      
      // Espera un poco antes de reintentar en caso de race condition
      await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
    }
    
    // Espera a que se replique la asociación business_members
    if (created) {
      await new Promise(r => setTimeout(r, 200));
    }
    
    ({ data: member } = await query());
    if (!member) {
      redirect("/login?error=" + encodeURIComponent("No se pudo crear el negocio (¿dirección en uso?)"));
    }
  }

  const business = member!.businesses as unknown as {
    id: string; name: string; slug: string; currency: string; timezone: string;
    phone: string | null; address: string | null; logo_url: string | null; app_trial_ends_at: string;
  };
  const [{ data: planRaw, error: planError }, { data: hasAccess, error: accessError }] = await Promise.all([
    supabase.rpc("effective_plan", { p_business: business.id }),
    supabase.rpc("business_has_access", { p_business: business.id }),
  ]);
  if (planError || accessError || typeof hasAccess !== "boolean" || !planRaw) {
    console.error("No se pudo comprobar el acceso del negocio", planError, accessError);
    throw new Error("No se pudo comprobar el acceso del negocio.");
  }
  const plan = parsePlan(planRaw);
  const now = Date.now();
  const inTrial = hasAccess && Date.parse(business.app_trial_ends_at) > now;
  return { supabase, user, business, plan, hasAccess, inTrial, now, role: member!.role as "owner" | "employee" };
});

export async function getContext() {
  const context = await getBillingContext();
  if (!context.hasAccess) redirect("/dashboard/plan");
  return context;
}
