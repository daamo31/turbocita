"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn, money } from "@/lib/utils";
import { createBooking, type BookingState } from "./actions";
import { getAvailableSlots, type Slot } from "./slots";

type Service = { id: string; name: string; description: string | null; duration_min: number; price: number };
type Pro = { id: string; name: string };
type Link = { professional_id: string; service_id: string };

const today = () => new Date().toLocaleDateString("en-CA"); // yyyy-mm-dd

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border p-3 text-left text-sm transition",
        active ? "border-primary bg-primary/5 ring-2 ring-primary" : "hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}

export function BookingForm({
  businessId, currency, services, professionals, links,
}: { businessId: string; currency: string; services: Service[]; professionals: Pro[]; links: Link[] }) {
  const [state, action, pending] = useActionState<BookingState, FormData>(createBooking, null);
  const [serviceId, setServiceId] = useState("");
  const [proId, setProId] = useState("");
  const [date, setDate] = useState(today());
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [startsAt, setStartsAt] = useState("");
  const [loading, startLoading] = useTransition();

  const service = services.find((s) => s.id === serviceId);
  const available = useMemo(
    () => professionals.filter((p) => links.some((l) => l.professional_id === p.id && l.service_id === serviceId)),
    [professionals, links, serviceId]
  );

  useEffect(() => {
    if (!serviceId || !proId || !date) return;
    let cancelled = false;
    startLoading(async () => {
      const res = await getAvailableSlots({ businessId, serviceId, professionalId: proId, date });
      if (!cancelled) { setSlots(res); setStartsAt(""); }
    });
    return () => { cancelled = true; };
  }, [businessId, serviceId, proId, date]);

  if (state?.ok) {
    return (
      <Card>
        <CardHeader><CardTitle>¡Reserva confirmada! ✅</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>{service?.name} con {professionals.find((p) => p.id === proId)?.name}</p>
          <p className="font-medium">
            {new Date(startsAt).toLocaleString("es-ES", { dateStyle: "full", timeStyle: "short" })}
          </p>
          <p className="text-muted-foreground">Si has facilitado tu teléfono recibirás un mensaje de confirmación.</p>
        </CardContent>
      </Card>
    );
  }

  const fe = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="professionalId" value={proId} />
      <input type="hidden" name="startsAt" value={startsAt} />

      <section className="space-y-2">
        <h2 className="font-semibold">1. Servicio</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {services.map((s) => (
            <Choice key={s.id} active={s.id === serviceId} onClick={() => { setServiceId(s.id); setProId(""); setSlots(null); setStartsAt(""); }}>
              <div className="font-medium">{s.name}</div>
              <div className="text-muted-foreground">{s.duration_min} min · {money(Number(s.price), currency)}</div>
            </Choice>
          ))}
          {services.length === 0 && <p className="text-sm text-muted-foreground">Este negocio aún no tiene servicios.</p>}
        </div>
      </section>

      {service && (
        <section className="space-y-2">
          <h2 className="font-semibold">2. Profesional</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {available.map((p) => (
              <Choice key={p.id} active={p.id === proId} onClick={() => { setProId(p.id); setSlots(null); setStartsAt(""); }}>
                {p.name}
              </Choice>
            ))}
            {available.length === 0 && <p className="text-sm text-muted-foreground">No hay profesionales para este servicio.</p>}
          </div>
        </section>
      )}

      {proId && (
        <section className="space-y-2">
          <h2 className="font-semibold">3. Fecha y hora</h2>
          <Input type="date" min={today()} value={date} onChange={(e) => setDate(e.target.value)} className="max-w-48" />
          {loading && <p className="text-sm text-muted-foreground">Buscando huecos…</p>}
          {!loading && slots?.length === 0 && <p className="text-sm text-muted-foreground">No hay huecos este día.</p>}
          <div className="flex flex-wrap gap-2">
            {slots?.map((s) => (
              <Button key={s.iso} type="button" size="sm" variant={s.iso === startsAt ? "default" : "outline"} onClick={() => setStartsAt(s.iso)}>
                {s.label}
              </Button>
            ))}
          </div>
        </section>
      )}

      {startsAt && (
        <section className="space-y-3">
          <h2 className="font-semibold">4. Tus datos</h2>
          <div className="space-y-1"><Label htmlFor="name">Nombre</Label><Input id="name" name="name" required />
            {fe?.name && <p className="text-xs text-destructive">{fe.name[0]}</p>}</div>
          <div className="space-y-1"><Label htmlFor="phone">Teléfono (WhatsApp/SMS)</Label><Input id="phone" name="phone" type="tel" placeholder="+34600000000" required />
            {fe?.phone && <p className="text-xs text-destructive">{fe.phone[0]}</p>}</div>
          <div className="space-y-1"><Label htmlFor="email">Email (opcional)</Label><Input id="email" name="email" type="email" /></div>
          <div className="space-y-1"><Label htmlFor="notes">Notas (opcional)</Label><Textarea id="notes" name="notes" maxLength={500} /></div>
          {state && !state.ok && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Reservando…" : "Confirmar reserva"}
          </Button>
        </section>
      )}
    </form>
  );
}
