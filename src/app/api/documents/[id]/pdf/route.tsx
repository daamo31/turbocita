import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { DocumentPdf, type PdfData } from "@/components/pdf/document-pdf";
import { TYPE_LABEL } from "@/lib/labels";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: RouteContext<"/api/documents/[id]/pdf">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  // RLS garantiza que solo se leen documentos del negocio del usuario
  const { data: d } = await supabase
    .from("documents")
    .select("type, number, status, issue_date, due_date, tax_rate, notes, clients(name, phone, email), businesses(name, address, phone, currency, business_private(tax_id, email)), document_items(description, quantity, unit_price)")
    .eq("id", id).maybeSingle();
  if (!d) return new NextResponse("Not found", { status: 404 });

  const biz = d.businesses as unknown as Omit<PdfData["business"], "tax_id" | "email"> & {
    business_private: { tax_id: string | null; email: string | null } | null;
  };
  const data: PdfData = {
    business: { ...biz, tax_id: biz.business_private?.tax_id ?? null, email: biz.business_private?.email ?? null },
    client: d.clients as unknown as PdfData["client"],
    doc: { ...d, tax_rate: Number(d.tax_rate) } as unknown as PdfData["doc"],
    items: d.document_items.map((i) => ({ ...i, quantity: Number(i.quantity), unit_price: Number(i.unit_price) })),
  };

  const buffer = await renderToBuffer(<DocumentPdf {...data} />);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${TYPE_LABEL[d.type as keyof typeof TYPE_LABEL]}-${d.number}.pdf"`,
    },
  });
}
