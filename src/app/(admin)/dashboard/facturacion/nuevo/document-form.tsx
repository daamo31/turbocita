"use client";

import { ActionForm, SubmitButton } from "@/components/action-form";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { money } from "@/lib/utils";
import { createDocument } from "../actions";

type Line = { description: string; quantity: number; unit_price: number };
type Client = { id: string; name: string; phone: string };

const selectCls = "h-11 md:h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm";

export function DocumentForm({
  currency, clients, catalog,
}: { currency: string; clients: Client[]; catalog: { name: string; price: number }[] }) {
  const [lines, setLines] = useState<Line[]>([{ description: "", quantity: 1, unit_price: 0 }]);
  const [tax, setTax] = useState(21);

  const update = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);
  const taxAmount = subtotal * (tax / 100);
  const valid = lines.length > 0 && lines.every((l) => l.description.trim() && l.quantity > 0);

  return (
    <ActionForm action={createDocument} success="Documento creado ✓" className="space-y-4">
      <input type="hidden" name="items" value={JSON.stringify(lines)} />
      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1"><Label>Tipo</Label>
            <select name="type" className={selectCls} defaultValue="invoice">
              <option value="invoice">Factura</option><option value="quote">Presupuesto</option>
            </select></div>
          <div className="space-y-1"><Label>Cliente existente</Label>
            <select name="clientId" className={selectCls} defaultValue="">
              <option value="">— Nuevo / sin cliente —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
            </select></div>
          <div className="space-y-1"><Label>Vencimiento</Label><Input name="dueDate" type="date" /></div>
          <div className="space-y-1"><Label>Nuevo cliente: nombre</Label><Input name="newName" /></div>
          <div className="space-y-1"><Label>Nuevo cliente: teléfono</Label><Input name="newPhone" /></div>
          <div className="space-y-1"><Label>IVA (%)</Label>
            <Input name="taxRate" type="number" min={0} max={100} step="0.01" value={tax} onChange={(e) => setTax(Number(e.target.value))} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          {catalog.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Añadir del catálogo:</span>
              {catalog.map((c, i) => (
                <Button key={i} type="button" size="xs" variant="outline"
                  onClick={() => setLines((ls) => [...ls.filter((l) => l.description || l.unit_price), { description: c.name, quantity: 1, unit_price: c.price }])}>
                  {c.name}
                </Button>
              ))}
            </div>
          )}
          {/* Móvil: cada línea es una mini-tarjeta con etiquetas; md+: fila compacta de 12 columnas */}
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border p-3 md:grid-cols-12 md:border-0 md:p-0">
              <div className="col-span-2 space-y-1 md:col-span-6">
                <Label className="md:sr-only">Descripción</Label>
                <Input placeholder="Descripción" value={l.description} onChange={(e) => update(i, { description: e.target.value })} />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label className="md:sr-only">Cantidad</Label>
                <Input type="number" inputMode="decimal" min={0.01} step="0.01" value={l.quantity} onChange={(e) => update(i, { quantity: Number(e.target.value) })} />
              </div>
              <div className="space-y-1 md:col-span-3">
                <Label className="md:sr-only">Precio</Label>
                <Input type="number" inputMode="decimal" min={0} step="0.01" value={l.unit_price} onChange={(e) => update(i, { unit_price: Number(e.target.value) })} />
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label="Quitar línea" className="col-span-2 w-full md:col-span-1 md:w-auto md:self-end"
                disabled={lines.length === 1} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>
                <span aria-hidden>✕</span><span className="ml-1 text-sm md:hidden">Quitar</span>
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setLines((ls) => [...ls, { description: "", quantity: 1, unit_price: 0 }])}>
            + Añadir línea
          </Button>
          <div className="ml-auto w-full space-y-1 text-right text-sm sm:w-56">
            <div>Subtotal: {money(subtotal, currency)}</div>
            <div>IVA: {money(taxAmount, currency)}</div>
            <div className="text-base font-bold">Total: {money(subtotal + taxAmount, currency)}</div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-1"><Label>Notas</Label><Textarea name="notes" maxLength={1000} /></div>
      <SubmitButton size="lg" className="w-full sm:w-auto" disabled={!valid}>Crear documento</SubmitButton>
    </ActionForm>
  );
}
