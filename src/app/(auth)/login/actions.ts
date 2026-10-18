"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const fail = (msg: string): never => redirect("/login?error=" + encodeURIComponent(msg));

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
  if (name.length < 2) fail("Indica el nombre del negocio");
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) fail("El enlace solo admite minúsculas, números y guiones (3-40)");
  if (password.length < 8) fail("La contraseña debe tener al menos 8 caracteres");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email") ?? ""),
    password,
    options: { data: { business_name: name, business_slug: slug } },
  });
  if (error) fail(error.message);
  // Sin sesión = confirmación por email pendiente; el negocio se crea en el primer acceso
  if (!data.session) fail("Revisa tu email para confirmar la cuenta y luego inicia sesión");
  redirect("/dashboard/agenda");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
