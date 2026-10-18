import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getContext } from "@/lib/auth";
import { money } from "@/lib/utils";
import { STATUS_LABEL, TYPE_LABEL } from "@/lib/labels";

export default async function BillingPage() {
  const { supabase, business } = await getContext();
  const { data: docs } = await supabase
    .from("documents")
    .select("id, type, number, status, issue_date, tax_rate, clients(name), document_items(quantity, unit_price)")
    .order("created_at", { ascending: false }).limit(100);

  const total = (d: { tax_rate: number | string; document_items: { quantity: number | string; unit_price: number | string }[] }) =>
    d.document_items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0) * (1 + Number(d.tax_rate) / 100);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-xl font-bold">Presupuestos y facturas</h1>
        <Link href="/dashboard/facturacion/nuevo" className="w-full sm:w-auto"><Button className="w-full">Nuevo documento</Button></Link>
      </div>
      {(docs ?? []).length === 0 && <p className="text-sm text-muted-foreground">Aún no hay documentos.</p>}

      {/* Móvil: tarjeta pulsable por documento */}
      <ul className="space-y-3 md:hidden">
        {(docs ?? []).map((d) => (
          <li key={d.id}>
            <Link href={`/dashboard/facturacion/${d.id}`} className="block">
              <Card className="transition active:scale-[0.99]">
                <CardContent className="space-y-1 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{TYPE_LABEL[d.type as keyof typeof TYPE_LABEL]} #{d.number}</span>
                    <Badge variant={d.status === "paid" ? "default" : d.status === "cancelled" ? "destructive" : "secondary"}>{STATUS_LABEL[d.status as keyof typeof STATUS_LABEL]}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">{(d.clients as unknown as { name: string } | null)?.name ?? "—"} · {d.issue_date}</div>
                  <div className="text-lg font-bold">{money(total(d), business.currency)}</div>
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>

      {/* Tablet/escritorio: tabla */}
      <div className="hidden md:block">
        <Table>
          <TableHeader><TableRow><TableHead>Documento</TableHead><TableHead>Cliente</TableHead><TableHead>Fecha</TableHead><TableHead>Total</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
          <TableBody>
            {(docs ?? []).map((d) => (
              <TableRow key={d.id}>
                <TableCell><Link className="underline" href={`/dashboard/facturacion/${d.id}`}>{TYPE_LABEL[d.type as keyof typeof TYPE_LABEL]} #{d.number}</Link></TableCell>
                <TableCell>{(d.clients as unknown as { name: string } | null)?.name ?? "—"}</TableCell>
                <TableCell>{d.issue_date}</TableCell>
                <TableCell>{money(total(d), business.currency)}</TableCell>
                <TableCell><Badge variant={d.status === "paid" ? "default" : d.status === "cancelled" ? "destructive" : "secondary"}>{STATUS_LABEL[d.status as keyof typeof STATUS_LABEL]}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
