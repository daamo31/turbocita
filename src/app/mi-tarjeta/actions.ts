"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// Acceso de clientes sin contraseña: enlace mágico al email. El email queda confirmado en Auth,
// y link_client_account() solo vincula fichas con ese mismo email verificado.
export async function sendClientLink(formData: FormData) {
  const email = z.string().trim().email().max(254).safeParse(formData.get("email"));
  const slug = String(formData.get("negocio") ?? "");
  const back = `/mi-tarjeta${/^[a-z0-9-]{3,40}$/.test(slug) ? `?negocio=${slug}` : ""}`;
  const sep = back.includes("?") ? "&" : "?";
  if (!email.success) redirect(`${back}${sep}error=${encodeURIComponent("Email no válido")}`);

  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(back)}` },
  });
  if (error) redirect(`${back}${sep}error=${encodeURIComponent("No se pudo enviar el enlace")}`);
  redirect(`${back}${sep}sent=1`);
}
