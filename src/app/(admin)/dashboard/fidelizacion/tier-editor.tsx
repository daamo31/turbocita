"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Row = { stamps: number; discount_percent: number; description: string };

const PRESETS: { name: string; tiers: Row[] }[] = [
  { name: "10 sellos = gratis", tiers: [{ stamps: 10, discount_percent: 100, description: "Servicio gratis" }] },
  {
    name: "5 → 50% · 10 → gratis",
    tiers: [
      { stamps: 5, discount_percent: 50, description: "50% de descuento" },
      { stamps: 10, discount_percent: 100, description: "Servicio gratis" },
    ],
  },
  {
    name: "3 → 20% · 6 → 50% · 10 → gratis",
    tiers: [
      { stamps: 3, discount_percent: 20, description: "20% de descuento" },
      { stamps: 6, discount_percent: 50, description: "50% de descuento" },
      { stamps: 10, discount_percent: 100, description: "Servicio gratis" },
    ],
  },
];

// Editor de niveles: el dueño decide cuántos sellos dan qué descuento (100% = gratis).
export function TierEditor({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial.length ? initial : PRESETS[0].tiers);
  const update = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const stamps = rows.map((r) => r.stamps);
  const duplicated = new Set(stamps).size !== stamps.length;
  const invalid = duplicated || rows.some((r) => !(r.stamps >= 1 && r.stamps <= 100 && r.discount_percent >= 1 && r.discount_percent <= 100));

  return (
    <div className="space-y-3 sm:col-span-2">
      <input type="hidden" name="tiers" value={JSON.stringify(rows)} />
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <Button key={p.name} type="button" variant="outline" size="sm" onClick={() => setRows(p.tiers)}>{p.name}</Button>
        ))}
      </div>

      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2 rounded-lg border p-2 sm:grid-cols-[6rem_6rem_1fr_auto]">
            <div className="space-y-1"><Label>Sellos</Label>
              <Input type="number" min={1} max={100} value={r.stamps} onChange={(e) => update(i, { stamps: Number(e.target.value) })} /></div>
            <div className="space-y-1"><Label>Descuento %</Label>
              <Input type="number" min={1} max={100} value={r.discount_percent} onChange={(e) => update(i, { discount_percent: Number(e.target.value) })} /></div>
            <div className="order-last col-span-3 space-y-1 sm:order-none sm:col-span-1"><Label>Nombre (opcional)</Label>
              <Input maxLength={160} value={r.description} placeholder={r.discount_percent >= 100 ? "Servicio gratis" : `${r.discount_percent}% de descuento`} onChange={(e) => update(i, { description: e.target.value })} /></div>
            <Button type="button" variant="ghost" size="icon" aria-label="Quitar nivel" disabled={rows.length === 1} onClick={() => setRows((x) => x.filter((_, j) => j !== i))}>
              <Trash2 />
            </Button>
          </div>
        ))}
      </div>

      {duplicated && <p role="alert" className="text-sm text-destructive">No repitas el número de sellos en dos niveles.</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={rows.length >= 10}
          onClick={() => setRows((x) => [...x, { stamps: Math.min(100, Math.max(...x.map((r) => r.stamps)) + 5), discount_percent: 100, description: "" }])}>
          <Plus /> Añadir nivel
        </Button>
        <Button type="submit" disabled={invalid}>Guardar programa</Button>
      </div>
      <p className="text-xs text-muted-foreground">
        El último nivel cierra el ciclo y la tarjeta vuelve a 0 sellos. Una cita con recompensa del 100% no suma sello; con descuento parcial, sí.
      </p>
    </div>
  );
}
