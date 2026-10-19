import { ActionForm } from "@/components/action-form";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getContext } from "@/lib/auth";
import { STATUS_LABEL, TYPE_LABEL } from "@/lib/labels";
import { money } from "@/lib/utils";
import { setDocumentStatus } from "../actions";

export default async function DocumentPage({ params }: PageProps<"/dashboard/facturacion/[id]">) {
  const { id } = await params;
  const { supabase, business } = await getContext();
  const { data: d } = await supabase
    .from("documents")
    .select("*, clients(name, phone, email), document_items(description, quantity, unit_price)")
    .eq("id", id).maybeSingle();
  if (!d) notFound();

  const client = d.clients as unknown as { name: string; phone: string; email: string | null } | null;
  const items = d.document_items as { description: string; quantity: number; unit_price: number }[];
  const sub = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0);
  const total = sub * (1 + Number(d.tax_rate) / 100);
  const title = `${TYPE_LABEL[d.type as keyof typeof TYPE_LABEL]} #${d.number}`;
  const text = `Hola${client ? ` ${client.name}` : ""}, te enviamos tu ${title} de ${business.name} por ${money(total, business.currency)}.`;
  const phone = client?.phone.replace(/[^\d]/g, "");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-xl font-bold">{title}</h1>
        <Badge>{STATUS_LABEL[d.status as keyof typeof STATUS_LABEL]}</Badge>
      </div>
      {/* Acciones: rejilla de 2 columnas en móvil, en línea desde sm */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <a href={`/api/documents/${d.id}/pdf`} target="_blank"><Button variant="outline" className="w-full">Descargar PDF</Button></a>
        {phone && <a href={`https://wa.me/${phone}?text=${encodeURIComponent(text)}`} target="_blank"><Button variant="outline" className="w-full">WhatsApp</Button></a>}
        {client?.email && <a href={`mailto:${client.email}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text)}`}><Button variant="outline" className="w-full">Email</Button></a>}
        <Link href="/dashboard/facturacion"><Button variant="ghost" className="w-full">Volver</Button></Link>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4 text-sm">
          <div>Cliente: {client ? `${client.name} · ${client.phone}` : "—"}</div>
          {/* Líneas: descripción arriba y cantidad × precio / importe debajo; sin scroll horizontal */}
          <ul className="divide-y">
            {items.map((i, k) => (
              <li key={k} className="flex items-start justify-between gap-3 py-2">
                <div className="min-w-0">
                  <div className="break-words">{i.description}</div>
                  <div className="text-xs text-muted-foreground">{Number(i.quantity)} × {money(Number(i.unit_price), business.currency)}</div>
                </div>
                <div className="shrink-0 font-medium">{money(Number(i.quantity) * Number(i.unit_price), business.currency)}</div>
              </li>
            ))}
          </ul>
          <div className="text-right font-bold">Total (IVA {Number(d.tax_rate)}% incl.): {money(total, business.currency)}</div>
        </CardContent>
      </Card>

      <ActionForm action={setDocumentStatus} success="Estado del documento actualizado" className="grid grid-cols-3 gap-2 sm:flex">
        <input type="hidden" name="id" value={d.id} />
        {(["pending", "paid", "cancelled"] as const).map((st) => (
          <Button key={st} name="status" value={st} type="submit" variant={d.status === st ? "default" : "outline"}>{STATUS_LABEL[st]}</Button>
        ))}
      </ActionForm>
    </div>
  );
}
