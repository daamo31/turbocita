import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Destino del enlace de confirmación por email (flujo PKCE)
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const info = searchParams.get("info");
  
  // Solo rutas internas, para evitar redirecciones abiertas
  let dest = "/dashboard/agenda";
  if (next && /^\/(?!\/|\\)/.test(next)) {
    dest = next;
  }
  
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Si hay un mensaje informativo (ej: tras signup), lo pasamos a través de la URL
      if (info) {
        return NextResponse.redirect(`${origin}${dest}?info=${encodeURIComponent(info)}`);
      }
      return NextResponse.redirect(`${origin}${dest}`);
    }
  }
  
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("El enlace no es válido o ha caducado. Inicia sesión.")}`);
}
