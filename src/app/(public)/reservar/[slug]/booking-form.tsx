"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
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
        "bk-card w-full p-4 text-left text-sm transition active:scale-[0.98]",
        active ? "!border-primary ring-2 ring-primary" : "hover:!border-primary/50"
      )}
    >
      {children}
    </button>
  );
}

const STEPS = ["Servicio", "Profesional", "Fecha y hora", "Tus datos"];
const MAX_DAYS_AHEAD = 90; // horizonte de reserva
const ymd = (d: Date) => d.toLocaleDateString("en-CA");

// Calendario mensual de 7 columnas: cabe en cualquier ancho (empieza en lunes)
function Calendar({ month, setMonth, date, onPick }: { month: Date; setMonth: (d: Date) => void; date: string; onPick: (v: string) => void }) {
  const todayD = new Date(); todayD.setHours(0, 0, 0, 0);
  const last = new Date(todayD); last.setDate(last.getDate() + MAX_DAYS_AHEAD);
  const lead = (month.getDay() + 6) % 7;
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  const prev = new Date(month.getFullYear(), month.getMonth() - 1, 1);
  const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const canPrev = new Date(month.getFullYear(), month.getMonth() + 1, 0) >= todayD && prev.getTime() >= new Date(todayD.getFullYear(), todayD.getMonth(), 1).getTime();
  const canNext = next <= last;

  return (
    <div className="bk-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" disabled={!canPrev} onClick={() => setMonth(prev)} aria-label="Mes anterior" className="flex size-11 items-center justify-center rounded-full text-lg disabled:opacity-30">‹</button>
        <div className="font-semibold capitalize">{month.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}</div>
        <button type="button" disabled={!canNext} onClick={() => setMonth(next)} aria-label="Mes siguiente" className="flex size-11 items-center justify-center rounded-full text-lg disabled:opacity-30">›</button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs text-muted-foreground">
        {["L", "M", "X", "J", "V", "S", "D"].map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const v = ymd(d);
          const disabled = d < todayD || d > last;
          const active = v === date;
          return (
            <button
              key={v} type="button" disabled={disabled} onClick={() => onPick(v)}
              className={cn(
                "aspect-square min-h-11 rounded-full text-sm transition",
                disabled ? "text-muted-foreground/40" : "hover:bg-muted",
                d.getTime() === todayD.getTime() && !active && "font-bold text-primary",
                active && "bg-primary font-bold text-primary-foreground hover:bg-primary"
              )}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
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
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [proId, setProId] = useState("");
  const [date, setDate] = useState(today());
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [startsAt, setStartsAt] = useState("");
  const [loading, startLoading] = useTransition();
  const [step, setStep] = useState(0);
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  // Cada paso empieza arriba para que no se quede a medio scroll en el móvil
  const goTo = (n: number) => { setStep(n); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const chosen = useMemo(() => services.filter((s) => serviceIds.includes(s.id)), [services, serviceIds]);
  const totalMin = chosen.reduce((n, s) => n + s.duration_min, 0);
  const totalPrice = chosen.reduce((n, s) => n + Number(s.price), 0);
  const serviceNames = chosen.map((s) => s.name).join(" + ");
  const fmtDuration = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}` : `${m} min`);
  const pro = professionals.find((p) => p.id === proId);
  const morning = (slots ?? []).filter((x) => x.label < "14:00");
  const afternoon = (slots ?? []).filter((x) => x.label >= "14:00");
  const available = useMemo(
    () => professionals.filter((p) => serviceIds.every((sid) => links.some((l) => l.professional_id === p.id && l.service_id === sid))),
    [professionals, links, serviceIds]
  );

  useEffect(() => {
    if (serviceIds.length === 0 || !proId || !date) return;
    let cancelled = false;
    startLoading(async () => {
      const res = await getAvailableSlots({ businessId, serviceIds, professionalId: proId, date });
      if (!cancelled) { setSlots(res); setStartsAt(""); }
    });
    return () => { cancelled = true; };
  }, [businessId, serviceIds, proId, date]);

  if (state?.ok) {
    return (
      <div className="bk-card space-y-4 p-6 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary text-2xl text-primary-foreground">✓</div>
        <h2 className="bk-title text-2xl font-bold">¡Reserva confirmada!</h2>
        <div className="space-y-1 text-sm">
          <p className="font-medium">{serviceNames} con {pro?.name}</p>
          <p className="text-lg font-semibold capitalize">
            {new Date(startsAt).toLocaleString("es-ES", { dateStyle: "full", timeStyle: "short" })}
          </p>
          <p className="text-muted-foreground">{businessName}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <a href={`/api/reservas/${state.appointmentId}/ics?t=${state.cancelToken}`}>
            <Button type="button" className="w-full">📲 Añadir al calendario del móvil</Button>
          </a>
          <a href={googleCalUrl(`${serviceNames} · ${businessName}`, startsAt, state.endsAt)} target="_blank" rel="noreferrer">
            <Button type="button" variant="outline" className="w-full">Google Calendar</Button>
          </a>
        </div>
        <p className="text-xs text-muted-foreground">Si has facilitado tu teléfono recibirás un mensaje de confirmación.</p>
      </div>
    );
  }

  const fe = state && !state.ok ? state.fieldErrors : undefined;

  const toggleService = (id: string) => {
    setServiceIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
    setProId(""); setSlots(null); setStartsAt("");
  };
  const continueFromServices = () => {
    if (serviceIds.length === 0) return;
    const pros = professionals.filter((p) => serviceIds.every((sid) => links.some((l) => l.professional_id === p.id && l.service_id === sid)));
    // Con un único profesional no hace falta preguntar
    if (pros.length === 1) { setProId(pros[0].id); goTo(2); } else { setProId(""); goTo(1); }
  };
  const choosePro = (id: string) => { setProId(id); setSlots(null); setStartsAt(""); goTo(2); };
  const chooseSlot = (iso: string) => { setStartsAt(iso); goTo(3); };
  const back = () => goTo(step === 2 && available.length === 1 ? 0 : step - 1);

  return (
    <form action={action} className="pb-24">
      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="serviceIds" value={serviceIds.join(",")} />
      <input type="hidden" name="professionalId" value={proId} />
      <input type="hidden" name="startsAt" value={startsAt} />

      <div className="bk-card mb-4 space-y-3 p-4">
        <div className="flex items-center gap-2">
          {step > 0 && (
            <button type="button" onClick={back} aria-label="Volver" className="flex size-9 items-center justify-center rounded-full border text-lg hover:bg-muted">←</button>
          )}
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">Paso {step + 1} de {STEPS.length}</div>
            <h2 className="font-semibold">{STEPS[step]}</h2>
          </div>
        </div>
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-muted")} />
          ))}
        </div>
        {step > 0 && (
          <div className="flex flex-wrap gap-1.5 text-xs">
            {chosen.length > 0 && <button type="button" onClick={() => goTo(0)} className="max-w-full truncate rounded-full border px-2.5 py-1">{serviceNames} ✎</button>}
            {pro && step > 1 && <button type="button" onClick={() => goTo(1)} className="rounded-full border px-2.5 py-1">{pro.name} ✎</button>}
            {startsAt && step > 2 && (
              <button type="button" onClick={() => goTo(2)} className="rounded-full border px-2.5 py-1 capitalize">
                {new Date(startsAt).toLocaleString("es-ES", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} ✎
              </button>
            )}
          </div>
        )}
      </div>

      {step === 0 && (
        <div className="grid gap-3">
          <p className="text-sm text-muted-foreground">Puedes elegir varios servicios (por ejemplo, corte + barba).</p>
          {services.map((s) => {
            const on = serviceIds.includes(s.id);
            return (
              <Choice key={s.id} active={on} onClick={() => toggleService(s.id)}>
                <div className="flex items-start gap-3">
                  <span aria-hidden className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border-2 text-sm font-bold transition", on ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40")}>
                    {on && "✓"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-medium">{s.name}</div>
                    {s.description && <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{s.description}</div>}
                    <div className="mt-1 text-xs text-muted-foreground">{fmtDuration(s.duration_min)}</div>
                  </div>
                  <div className="shrink-0 text-base font-semibold text-primary">{money(Number(s.price), currency)}</div>
                </div>
              </Choice>
            );
          })}
          {services.length === 0 && <p className="text-sm text-muted-foreground">Este negocio aún no tiene servicios.</p>}
        </div>
      )}

      {step === 1 && (
        <div className="grid gap-3">
          {available.map((p) => (
            <Choice key={p.id} active={p.id === proId} onClick={() => choosePro(p.id)}>
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground">
                  {p.name.trim().charAt(0).toUpperCase()}
                </span>
                <span className="text-base font-medium">{p.name}</span>
              </div>
            </Choice>
          ))}
          {available.length === 0 && <p className="text-sm text-muted-foreground">No hay profesionales para este servicio.</p>}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Calendar month={month} setMonth={setMonth} date={date} onPick={setDate} />
          {loading && <p className="text-sm text-muted-foreground">Buscando huecos…</p>}
          {!loading && slots?.length === 0 && <p className="bk-card p-4 text-sm text-muted-foreground">No hay huecos este día. Prueba con otro.</p>}
          {/* Horas agrupadas: cuadrícula de 3 columnas, sin scroll horizontal */}
          {[["Mañana", morning], ["Tarde", afternoon]].map(([label, list]) =>
            (list as Slot[]).length > 0 && (
              <div key={label as string} className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label as string}</h3>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {(list as Slot[]).map((sl) => (
                    <button
                      key={sl.iso} type="button" onClick={() => chooseSlot(sl.iso)}
                      className={cn("bk-card h-12 text-center text-sm font-medium transition hover:!border-primary", sl.iso === startsAt && "!border-primary ring-2 ring-primary")}
                    >
                      {sl.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Siempre montado (oculto) para no perder lo escrito al volver atrás */}
      <div className={cn("space-y-3", step !== 3 && "hidden")}>
        <div className="bk-card space-y-3 p-4">
          <div className="space-y-1"><Label htmlFor="name">Nombre</Label><Input id="name" name="name" required autoComplete="name" className="h-11" />
            {fe?.name && <p className="text-xs text-destructive">{fe.name[0]}</p>}</div>
          <div className="space-y-1"><Label htmlFor="phone">Teléfono (WhatsApp/SMS)</Label><Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+34600000000" required className="h-11" />
            {fe?.phone && <p className="text-xs text-destructive">{fe.phone[0]}</p>}</div>
          <div className="space-y-1"><Label htmlFor="email">Email (opcional)</Label><Input id="email" name="email" type="email" autoComplete="email" className="h-11" /></div>
          <div className="space-y-1"><Label htmlFor="notes">Notas (opcional)</Label><Textarea id="notes" name="notes" maxLength={500} /></div>
        </div>
        {state && !state.ok && <p className="text-sm text-destructive">{state.error}</p>}
      </div>

      {(step === 0 || step === 3) && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            <div className="min-w-0 text-xs leading-tight">
              {chosen.length > 0 ? (
                <>
                  <div className="truncate font-semibold">{serviceNames}</div>
                  <div className="text-muted-foreground">{fmtDuration(totalMin)} · <span className="font-semibold text-foreground">{money(totalPrice, currency)}</span></div>
                </>
              ) : (
                <div className="text-muted-foreground">Selecciona al menos un servicio</div>
              )}
            </div>
            {step === 0 ? (
              <Button type="button" size="lg" className="ml-auto h-12 shrink-0 px-6" disabled={chosen.length === 0} onClick={continueFromServices}>
                Continuar
              </Button>
            ) : (
              <Button type="submit" size="lg" className="ml-auto h-12 shrink-0 px-6" disabled={pending || !startsAt}>
                {pending ? "Reservando…" : "Confirmar"}
              </Button>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
