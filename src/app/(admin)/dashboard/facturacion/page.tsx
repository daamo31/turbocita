import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <h1 className="mr-auto text-xl font-bold">Presupuestos y facturas</h1>
        <Link href="/dashboard/facturacion/nuevo"><Button>Nuevo documento</Button></Link>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Documento</TableHead><TableHead>Cliente</TableHead><TableHead>Fecha</TableHead><TableHead>Total</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
        <TableBody>
          {(docs ?? []).map((d) => {
            const sub = d.document_items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0);
            return (
              <TableRow key={d.id}>
                <TableCell><Link className="underline" href={`/dashboard/facturacion/${d.id}`}>{TYPE_LABEL[d.type as keyof typeof TYPE_LABEL]} #{d.number}</Link></TableCell>
                <TableCell>{(d.clients as unknown as { name: string } | null)?.name ?? "—"}</TableCell>
                <TableCell>{d.issue_date}</TableCell>
                <TableCell>{money(sub * (1 + Number(d.tax_rate) / 100), business.currency)}</TableCell>
                <TableCell><Badge variant={d.status === "paid" ? "default" : d.status === "cancelled" ? "destructive" : "secondary"}>{STATUS_LABEL[d.status as keyof typeof STATUS_LABEL]}</Badge></TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
