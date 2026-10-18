"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type Range = { start: string; end: string };
// Clave = día de la semana (0 = domingo … 6 = sábado); valor = tramos de ese día
export type Schedule = Record<string, Range[]>;

const DAYS: [string, string][] = [
  ["1", "Lunes"], ["2", "Martes"], ["3", "Miércoles"], ["4", "Jueves"], ["5", "Viernes"], ["6", "Sábado"], ["0", "Domingo"],
];
const MAX_RANGES = 3;

// Editor de horario semanal con varios tramos por día (p. ej. mañana y tarde con descanso).
// Serializa el resultado en un input oculto `schedule` para el Server Action.
export function ScheduleEditor({ initial }: { initial?: Schedule }) {
  // Sin valores impuestos: parte del horario del negocio o de todo cerrado
  const [sch, setSch] = useState<Schedule>(initial ?? {});

  const setRanges = (day: string, ranges: Range[]) =>
    setSch((s) => {
      const next = { ...s };
      if (ranges.length) next[day] = ranges; else delete next[day];
      return next;
    });
  const patch = (day: string, i: number, p: Partial<Range>) =>
    setRanges(day, sch[day].map((r, j) => (j === i ? { ...r, ...p } : r)));

  const toggle = (day: string) => {
    if (sch[day]?.length) return setRanges(day, []);
    // Al abrir un día se copia el de otro ya configurado; si no hay ninguno, una sugerencia editable
    const other = Object.values(sch).find((r) => r.length);
    setRanges(day, other ? other.map((r) => ({ ...r })) : [{ start: "09:00", end: "17:00" }]);
  };

  const addRange = (day: string) => {
    const last = sch[day][sch[day].length - 1];
    // Nuevo tramo: empieza 2 h después del cierre anterior y dura hasta 4 h (tope 23:59)
    const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
    const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    const start = Math.min(toMin(last.end) + 120, 23 * 60);
    setRanges(day, [...sch[day], { start: fmt(start), end: fmt(Math.min(start + 240, 23 * 60 + 59)) }]);
  };

  // Copia este día a todos los demás días que estén abiertos
  const copyFrom = (day: string) => {
    const src = sch[day];
    if (!src?.length) return;
    setSch((s) => {
      const next = { ...s };
      for (const d of Object.keys(s)) if (d !== day && s[d].length) next[d] = src.map((r) => ({ ...r }));
      return next;
    });
  };

  return (
    <div className="space-y-2">
      <input type="hidden" name="schedule" value={JSON.stringify(sch)} />
      {DAYS.map(([day, label]) => {
        const ranges = sch[day] ?? [];
        const open = ranges.length > 0;
        return (
          <div key={day} className={cn("rounded-lg border p-3", !open && "bg-muted/40")}>
            <div className="flex items-center gap-3">
              <label className="flex min-h-11 flex-1 items-center gap-3 text-sm font-medium">
                <input type="checkbox" checked={open} onChange={() => toggle(day)} className="size-5" />
                {label}
                {!open && <span className="font-normal text-muted-foreground">Cerrado</span>}
              </label>
              {open && Object.values(sch).filter((r) => r.length).length > 1 && (
                <Button type="button" size="sm" variant="ghost" onClick={() => copyFrom(day)}>
                  Copiar a los demás
                </Button>
              )}
            </div>
            {open && (
              <div className="mt-2 space-y-2">
                {ranges.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input type="time" aria-label={`${label}: abre`} value={r.start} onChange={(e) => patch(day, i, { start: e.target.value })} className="min-w-0 flex-1" />
                    <span className="text-muted-foreground">–</span>
                    <Input type="time" aria-label={`${label}: cierra`} value={r.end} onChange={(e) => patch(day, i, { end: e.target.value })} className="min-w-0 flex-1" />
                    <Button
                      type="button" variant="ghost" size="icon" aria-label="Quitar tramo"
                      onClick={() => setRanges(day, ranges.filter((_, j) => j !== i))}
                    >
                      ✕
                    </Button>
                  </div>
                ))}
                {ranges.length < MAX_RANGES && (
                  <Button type="button" size="sm" variant="outline" onClick={() => addRange(day)}>
                    + Añadir tramo (p. ej. tarde)
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">
        Los clientes solo podrán reservar dentro de estos tramos. Los días sin marcar figuran como cerrados.
      </p>
    </div>
  );
}
