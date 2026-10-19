"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { completeAppointment } from "../fidelizacion/actions";
import type { CompleteAppointmentResult } from "@/types/loyalty";

interface Props {
  appointmentId: string;
  clientName: string;
  serviceLabel: string;
  // null si el negocio no tiene programa activo o el servicio no aplica
  loyalty: { requiredStamps: number; currentStamps: number; rewards: { id: string; discount_percent: number; description: string }[] } | null;
}

export function CompleteDialog({ appointmentId, clientName, serviceLabel, loyalty }: Props) {
  const [open, setOpen] = useState(false);
  const [rewardId, setRewardId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompleteAppointmentResult | null>(null);
  const [pending, start] = useTransition();

  const selected = loyalty?.rewards.find((r) => r.id === rewardId);

  const confirm = () =>
    start(async () => {
      setError(null);
      const res = await completeAppointment({ id: appointmentId, rewardId });
      if (res.ok) { setResult(res.result); toast.success("Cita completada ✓"); }
      else { setError(res.error); toast.error(res.error); }
    });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!pending) { setOpen(o); if (!o) { setError(null); setRewardId(null); } } }}>
      <DialogTrigger render={<Button type="button" size="xs" variant="outline">Completar</Button>} />
      <DialogContent>
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle>Cita completada</DialogTitle>
              <DialogDescription>{clientName} · {serviceLabel}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 text-sm" role="status">
              {result.stamp_awarded && (
                <p className="flex items-center gap-2 font-semibold text-primary"><Check className="size-4" /> +1 Sello otorgado ({result.current_stamps}/{result.required_stamps})</p>
              )}
              {result.rewards_unlocked.map((r) => (
                <p key={r.id} className="flex items-center gap-2 font-semibold text-primary"><Gift className="size-4" /> ¡Recompensa desbloqueada: {r.description}!</p>
              ))}
              {result.redeemed_discount_percent != null && (
                <p className="flex items-center gap-2 font-semibold text-primary"><Gift className="size-4" /> Recompensa canjeada ({result.redeemed_discount_percent}% de descuento)</p>
              )}
              {!result.applies && <p className="text-muted-foreground">Este servicio no participa en el programa de fidelización.</p>}
            </div>
            <DialogFooter><Button type="button" onClick={() => setOpen(false)}>Cerrar</Button></DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Finalizar cita</DialogTitle>
              <DialogDescription>{clientName} · {serviceLabel}</DialogDescription>
            </DialogHeader>
            {loyalty && (
              <div className="space-y-3 text-sm">
                <p>Sellos: <strong>{loyalty.currentStamps}/{loyalty.requiredStamps}</strong>{selected?.discount_percent !== 100 && " · se sumará 1 sello al completar."}</p>
                {loyalty.rewards.length > 0 && (
                  <fieldset className="space-y-2">
                    <legend className="mb-1 font-medium">Recompensas disponibles</legend>
                    {[{ id: null, label: "No aplicar recompensa", sub: "" }, ...loyalty.rewards.map((r) => ({ id: r.id, label: `Aplicar: ${r.description} (${r.discount_percent}% desc)`, sub: r.discount_percent === 100 ? "No suma sello." : "" }))].map((o) => (
                      <label key={o.id ?? "none"} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3 has-checked:border-primary has-checked:bg-primary/10">
                        <input type="radio" name="reward" className="mt-0.5 size-4" checked={rewardId === o.id} onChange={() => setRewardId(o.id)} />
                        <span><span className="block font-medium">{o.label}</span>{o.sub && <span className="text-muted-foreground">{o.sub}</span>}</span>
                      </label>
                    ))}
                  </fieldset>
                )}
              </div>
            )}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>Volver</Button>
              <Button type="button" disabled={pending} onClick={confirm}>{pending ? "Guardando…" : "Marcar como completada"}</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
