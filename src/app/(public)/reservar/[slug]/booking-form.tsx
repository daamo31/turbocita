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
        "bk-card p-3 text-left text-sm transition hover:-translate-y-0.5",
        active ? "!border-primary ring-2 ring-primary" : "hover:!border-primary/50"
      )}
    >
      {children}
    </button>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="bk-card space-y-3 p-4 sm:p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

const googleCalUrl = (title: string, startsAt: string, endsAt: string) => {
  const f = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${f(startsAt)}/${f(endsAt)}`;
};

export function BookingForm({
  businessId, businessName, currency, services, professionals, links,
}: { businessId: string; businessName: string; currency: string; services: Service[]; professionals: Pro[]; links: Link[] }) {
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
    const pro = professionals.find((p) => p.id === proId);
    return (
      <div className="bk-card space-y-4 p-6 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary text-2xl text-primary-foreground">✓</div>
        <h2 className="bk-title text-2xl font-bold">¡Reserva confirmada!</h2>
        <div className="space-y-1 text-sm">
          <p className="font-medium">{service?.name} con {pro?.name}</p>
          <p className="text-lg font-semibold capitalize">
            {new Date(startsAt).toLocaleString("es-ES", { dateStyle: "full", timeStyle: "short" })}
          </p>
          <p className="text-muted-foreground">{businessName}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <a href={`/api/reservas/${state.appointmentId}/ics?t=${state.cancelToken}`}>
            <Button type="button" className="w-full">📲 Añadir al calendario del móvil</Button>
          </a>
          <a href={googleCalUrl(`${service?.name} · ${businessName}`, startsAt, state.endsAt)} target="_blank" rel="noreferrer">
            <Button type="button" variant="outline" className="w-full">Google Calendar</Button>
          </a>
        </div>
        <p className="text-xs text-muted-foreground">Si has facilitado tu teléfono recibirás un mensaje de confirmación.</p>
      </div>
    );
  }

  const fe = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="professionalId" value={proId} />
      <input type="hidden" name="startsAt" value={startsAt} />

      <Step n={1} title="Servicio">
        <div className="grid gap-2 sm:grid-cols-2">
          {services.map((s) => (
            <Choice key={s.id} active={s.id === serviceId} onClick={() => { setServiceId(s.id); setProId(""); setSlots(null); setStartsAt(""); }}>
              <div className="font-medium">{s.name}</div>
              <div className="mt-0.5 flex justify-between text-muted-foreground">
                <span>{s.duration_min} min</span><span className="font-semibold text-primary">{money(Number(s.price), currency)}</span>
              </div>
            </Choice>
          ))}
          {services.length === 0 && <p className="text-sm text-muted-foreground">Este negocio aún no tiene servicios.</p>}
        </div>
      </Step>

      {service && (
        <Step n={2} title="Profesional">
          <div className="grid gap-2 sm:grid-cols-2">
            {available.map((p) => (
              <Choice key={p.id} active={p.id === proId} onClick={() => { setProId(p.id); setSlots(null); setStartsAt(""); }}>
                {p.name}
              </Choice>
            ))}
            {available.length === 0 && <p className="text-sm text-muted-foreground">No hay profesionales para este servicio.</p>}
          </div>
        </Step>
      )}

      {proId && (
        <Step n={3} title="Fecha y hora">
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
        </Step>
      )}

      {startsAt && (
        <Step n={4} title="Tus datos">
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
        </Step>
      )}
    </form>
  );
}
