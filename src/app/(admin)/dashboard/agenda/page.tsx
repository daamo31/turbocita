import Link from "next/link";
import { TZDate } from "@date-fns/tz";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getContext } from "@/lib/auth";
import { setAppointmentStatus } from "./actions";

const LABEL: Record<string, string> = {
  pending: "Pendiente", confirmed: "Confirmada", completed: "Completada", cancelled: "Cancelada", no_show: "No asistió",
};

const shift = (date: string, days: number) => {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export default async function AgendaPage({ searchParams }: PageProps<"/dashboard/agenda">) {
  const { supabase, business } = await getContext();
  const sp = await searchParams;
  const tz = business.timezone;
  const todayLocal = new Date().toLocaleDateString("en-CA", { timeZone: tz });
  const date = typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : todayLocal;

  const [y, m, d] = date.split("-").map(Number);
  const from = new TZDate(y, m - 1, d, 0, 0, 0, tz).toISOString();
  const to = new TZDate(y, m - 1, d + 1, 0, 0, 0, tz).toISOString();

  const { data: appts } = await supabase
    .from("appointments")
    .select("id, starts_at, ends_at, status, notes, clients(name, phone), professionals(name), services(name)")
    .gte("starts_at", from).lt("starts_at", to).order("starts_at");

  // Resumen de los próximos 14 días desde hoy, para ver las reservas sin navegar día a día
  const [ty, tm, td] = todayLocal.split("-").map(Number);
  const rangeFrom = new TZDate(ty, tm - 1, td, 0, 0, 0, tz).toISOString();
  const rangeTo = new TZDate(ty, tm - 1, td + 14, 0, 0, 0, tz).toISOString();
  const { data: upcoming } = await supabase
    .from("appointments")
    .select("id, starts_at, status, clients(name), services(name)")
    .gte("starts_at", rangeFrom).lt("starts_at", rangeTo)
    .in("status", ["pending", "confirmed"]).order("starts_at");

  const perDay = new Map<string, { total: number; pending: number }>();
  for (const u of upcoming ?? []) {
    const k = new Date(u.starts_at).toLocaleDateString("en-CA", { timeZone: tz });
    const e = perDay.get(k) ?? { total: 0, pending: 0 };
    e.total++;
    if (u.status === "pending") e.pending++;
    perDay.set(k, e);
  }
  const days = Array.from({ length: 14 }, (_, i) => shift(todayLocal, i));
  const pendingList = (upcoming ?? []).filter((u) => u.status === "pending");
  const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short", timeZone: tz });

  const fmt = (iso: string) => new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: tz });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="w-full text-lg font-bold capitalize sm:w-auto sm:flex-1 sm:text-xl">
          {new Date(date + "T12:00:00Z").toLocaleDateString("es-ES", { dateStyle: "full", timeZone: "UTC" })}
        </h1>
        <div className="grid w-full grid-cols-[1fr_2fr_1fr] gap-2 sm:flex sm:w-auto">
          <Link href={`?date=${shift(date, -1)}`}><Button variant="outline" className="w-full" aria-label="Día anterior">←</Button></Link>
          <Link href="?"><Button variant="outline" className="w-full">Hoy</Button></Link>
          <Link href={`?date=${shift(date, 1)}`}><Button variant="outline" className="w-full" aria-label="Día siguiente">→</Button></Link>
        </div>
      </div>

      <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
        {days.map((day) => {
          const info = perDay.get(day);
          const active = day === date;
          return (
            <Link
              key={day}
              href={`?date=${day}`}
              className={`min-w-16 shrink-0 snap-start rounded-lg border p-2 text-center text-xs transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              <div className="capitalize">{new Date(day + "T12:00:00Z").toLocaleDateString("es-ES", { weekday: "short", timeZone: "UTC" })}</div>
              <div className="text-base font-bold">{day.slice(8)}</div>
              {info ? (
                <div className={`mt-1 rounded-full px-1.5 py-0.5 font-semibold ${active ? "bg-primary-foreground text-primary" : info.pending ? "bg-amber-500 text-white" : "bg-primary text-primary-foreground"}`}>
                  {info.total}
                </div>
              ) : (
                <div className="mt-1 py-0.5 opacity-40">–</div>
              )}
            </Link>
          );
        })}
      </div>

      {pendingList.length > 0 && (
        <Card className="border-amber-500/50">
          <CardContent className="space-y-2 p-4">
            <div className="font-semibold">{pendingList.length} reserva{pendingList.length > 1 ? "s" : ""} pendiente{pendingList.length > 1 ? "s" : ""} de confirmar</div>
            <ul className="space-y-1 text-sm">
              {pendingList.map((u) => (
                <li key={u.id}>
                  <Link className="underline" href={`?date=${new Date(u.starts_at).toLocaleDateString("en-CA", { timeZone: tz })}`}>
                    <span className="capitalize">{fmtDay(u.starts_at)}</span> {fmt(u.starts_at)}
                  </Link>{" "}
                  · {(u.clients as unknown as { name: string }).name} · {(u.services as unknown as { name: string }).name}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {(appts ?? []).length === 0 && <p className="text-muted-foreground">No hay citas este día.</p>}

      {(appts ?? []).map((a) => {
        const c = a.clients as unknown as { name: string; phone: string };
        return (
          <Card key={a.id}>
            <CardContent className="space-y-3 p-4 md:flex md:items-center md:gap-4 md:space-y-0">
              <div className="flex items-center justify-between gap-2 md:block md:w-32 md:shrink-0">
                <div className="font-mono text-base font-semibold md:text-sm">{fmt(a.starts_at)} – {fmt(a.ends_at)}</div>
                <Badge className="md:hidden" variant={a.status === "cancelled" || a.status === "no_show" ? "destructive" : "secondary"}>{LABEL[a.status]}</Badge>
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium">{c.name} · <a className="underline" href={`tel:${c.phone}`}>{c.phone}</a></div>
                <div className="break-words text-sm text-muted-foreground">
                  {(a.services as unknown as { name: string }).name} · {(a.professionals as unknown as { name: string }).name}
                  {a.notes && ` · ${a.notes}`}
                </div>
              </div>
              <Badge className="hidden md:inline-flex" variant={a.status === "cancelled" || a.status === "no_show" ? "destructive" : "secondary"}>{LABEL[a.status]}</Badge>
              {/* Botones a todo el ancho en móvil para pulsar con el pulgar */}
              <form action={setAppointmentStatus} className="flex flex-wrap gap-2 [&>button]:flex-1 md:[&>button]:flex-none">
                <input type="hidden" name="id" value={a.id} />
                {a.status === "pending" && <Button type="submit" size="xs" name="status" value="confirmed">Confirmar</Button>}
                {(a.status === "pending" || a.status === "confirmed") && (
                  <>
                    <Button type="submit" size="xs" variant="outline" name="status" value="completed">Completar</Button>
                    <Button type="submit" size="xs" variant="destructive" name="status" value="cancelled">Cancelar</Button>
                  </>
                )}
              </form>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
