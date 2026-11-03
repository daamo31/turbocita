import { NextResponse } from "next/server";
import { getContext } from "@/lib/auth";
import { csv, PLAN_ORDER } from "@/lib/plans";

export const runtime = "nodejs";

export async function GET() {
  const { supabase, business, plan, role } = await getContext();
  if (role !== "owner") return new NextResponse("Forbidden", { status: 403 });
  if (PLAN_ORDER.indexOf(plan) < PLAN_ORDER.indexOf("growth"))
    return new NextResponse("Disponible desde el plan Growth", { status: 403 });

  const { data } = await supabase
    .from("clients")
    .select("name, phone, email, created_at")
    .eq("business_id", business.id)
    .is("anonymized_at", null)
    .order("created_at", { ascending: false })
    .limit(10000);

  const body = csv([
    ["Nombre", "Teléfono", "Email", "Alta"],
    ...(data ?? []).map((c) => [c.name, c.phone, c.email, c.created_at?.slice(0, 10)]),
  ]);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clientes-${business.slug}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
