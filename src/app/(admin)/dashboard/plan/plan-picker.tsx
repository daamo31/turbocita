"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { SubmitButton } from "@/components/action-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PLAN_ORDER, PLANS, type PlanId } from "@/lib/plans";
import { openPortal, startCheckout } from "./actions";

type Props = {
  plan: PlanId;
  interval: "month" | "year";
  subscribed: boolean; // hay suscripción de Stripe viva
  status: string;
  inTrial: boolean;
  hasAccess: boolean;
  enabled: boolean; // Stripe configurado
  isOwner: boolean;
};

export function PlanPicker({ plan, interval: current, subscribed, status, enabled, isOwner, inTrial, hasAccess }: Props) {
  const [interval, setInterval] = useState<"month" | "year">(current);

  return (
    <div className="space-y-4">
      <div role="group" aria-label="Periodicidad" className="inline-flex rounded-lg border p-1 text-sm">
        {(["month", "year"] as const).map((i) => (
          <button key={i} type="button" onClick={() => setInterval(i)} aria-pressed={interval === i}
            className={cn("min-h-9 rounded-md px-3 font-medium", interval === i ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
            {i === "month" ? "Mensual" : "Anual (−20 %)"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {PLAN_ORDER.map((id) => {
          const p = PLANS[id];
          const isCurrent = subscribed && hasAccess && !inTrial && id === plan && status !== "canceled";
          const price = interval === "year" ? p.yearlyMonthly : p.monthly;
          return (
            <Card key={id} className={cn("h-full", isCurrent && "ring-2 ring-primary")}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {p.name} {isCurrent && <Badge>Actual</Badge>}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{p.audience}</p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3">
                <div>
                  <span className="text-3xl font-bold">{price} €</span>
                  <span className="text-sm text-muted-foreground"> /mes{id === "pro" && " por sede"}</span>
                  {interval === "year" && <div className="text-xs text-muted-foreground">Facturado {p.yearlyTotal} € al año</div>}
                </div>
                <ul className="flex-1 space-y-1.5 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-primary" />{f}</li>
                  ))}
                  <li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-primary" />Soporte: {p.support}</li>
                </ul>
                {enabled && isOwner && !subscribed && (
                  <form action={startCheckout} className="mt-auto">
                    <input type="hidden" name="plan" value={id} />
                    <input type="hidden" name="interval" value={interval} />
                    <SubmitButton className="w-full">Elegir {p.name}</SubmitButton>
                  </form>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {enabled && isOwner && subscribed && (
        <form action={openPortal}>
          <SubmitButton variant="outline">Cambiar de plan, método de pago o cancelar</SubmitButton>
        </form>
      )}
    </div>
  );
}
