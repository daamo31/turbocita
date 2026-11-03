import { NextResponse } from "next/server";
import { getContext } from "@/lib/auth";
import { csv, hasFeature } from "@/lib/plans";

export const runtime = "nodejs";

export async function GET() {
  const { supabase, business, plan, role } = await getContext();
  if (role !== "owner") return new NextResponse("Forbidden", { status: 403 });
  if (!hasFeature(plan, "invoicing")) return new NextResponse("Disponible desde el plan Growth", { status: 403 });

  const { data } = await supabase
    .from("documents")
    .select("type, number, status, issue_date, tax_rate, clients(name), document_items(quantity, unit_price)")
    .eq("business_id", business.id)
    .order("issue_date", { ascending: false })
    .limit(10000);

  const rows = (data ?? []).map((d) => {
    const items = d.document_items as unknown as { quantity: number | string; unit_price: number | string }[];
    const base = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0);
    const rate = Number(d.tax_rate);
    const client = d.clients as unknown as { name: string } | null;
    return [d.type, d.number, d.issue_date, client?.name, d.status, base.toFixed(2), rate, (base * rate / 100).toFixed(2), (base * (1 + rate / 100)).toFixed(2)];
  });
  const body = csv([["Tipo", "Número", "Fecha", "Cliente", "Estado", "Base", "IVA %", "Cuota IVA", "Total"], ...rows]);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="documentos-${business.slug}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
