"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { slugError } from "@/lib/slug";

const fail = (msg: string): never => redirect("/login?error=" + encodeURIComponent(msg));
const failSignup = (msg: string): never => redirect("/registro?error=" + encodeURIComponent(msg));

export async function checkSlug(slug: string): Promise<boolean> {
  if (slugError(slug)) return false;
  const supabase = await createClient();
  const { data } = await supabase.from("businesses").select("id").eq("slug", slug).maybeSingle();
  return !data;
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error) fail("Credenciales incorrectas");
  redirect("/dashboard/agenda");
}

export async function signUp(formData: FormData) {
  const name = String(formData.get("business_name") ?? "").trim();
  const slug = String(formData.get("business_slug") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (name.length < 2) failSignup("Indica el nombre del negocio");
  const slugErr = slugError(slug);
  if (slugErr) failSignup(slugErr);
  if (password.length < 8) failSignup("La contraseña debe tener al menos 8 caracteres");
  if (!(await checkSlug(slug))) failSignup("Esa dirección ya está en uso. Elige otra.");

  const supabase = await createClient();
  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email") ?? ""),
    password,
    options: { data: { business_name: name, business_slug: slug }, emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) failSignup(error.message);
  // Sin sesión = confirmación por email pendiente; el negocio se crea en el primer acceso
  if (!data.session) redirect("/login?info=" + encodeURIComponent("Cuenta creada. Revisa tu email para confirmarla y luego inicia sesión."));
  redirect("/dashboard/agenda");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
