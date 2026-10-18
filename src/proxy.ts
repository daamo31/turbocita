import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.toLowerCase(); // ej. turbocita.com

// Devuelve el slug del negocio si el host es de un tenant (subdominio o dominio propio).
async function tenantSlug(rawHost: string): Promise<string | null> {
  const host = rawHost.split(":")[0].toLowerCase();
  if (!ROOT || host === ROOT || host === `www.${ROOT}` || host === "localhost" || host.endsWith(".vercel.app")) return null;

  if (host.endsWith(`.${ROOT}`)) {
    const sub = host.slice(0, -(ROOT.length + 1));
    return /^[a-z0-9-]{3,40}$/.test(sub) ? sub : null;
  }
  if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(host)) return null;
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/businesses?select=slug&custom_domain=eq.${encodeURIComponent(host)}&limit=1`,
    {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
      next: { revalidate: 60 },
    }
  );
  if (!res.ok) return null;
  const rows: { slug: string }[] = await res.json();
  return rows[0]?.slug ?? null;
}

// Next 16: "proxy" sustituye a "middleware". Refresca la sesión y protege /dashboard.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const slug = await tenantSlug(request.headers.get("host") ?? "");
  if (slug) {
    // En el dominio de una tienda solo se sirve su página de reservas
    if (pathname === "/") return NextResponse.rewrite(new URL(`/reservar/${slug}`, request.url));
    if (pathname.startsWith("/dashboard") || pathname === "/login" || pathname === "/registro") return new NextResponse("Not found", { status: 404 });
    return NextResponse.next();
  }

  if (!pathname.startsWith("/dashboard") && pathname !== "/login" && pathname !== "/registro") return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(list) {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (user && (pathname === "/login" || pathname === "/registro")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard/agenda";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/|api/|favicon.ico).*)"],
};
