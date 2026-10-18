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

  const fmt = (iso: string) => new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: tz });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-xl font-bold">
          Agenda · {new Date(date + "T12:00:00Z").toLocaleDateString("es-ES", { dateStyle: "full", timeZone: "UTC" })}
        </h1>
        <Link href={`?date=${shift(date, -1)}`}><Button variant="outline" size="sm">←</Button></Link>
        <Link href="?"><Button variant="outline" size="sm">Hoy</Button></Link>
        <Link href={`?date=${shift(date, 1)}`}><Button variant="outline" size="sm">→</Button></Link>
      </div>

      {(appts ?? []).length === 0 && <p className="text-muted-foreground">No hay citas este día.</p>}

      {(appts ?? []).map((a) => {
        const c = a.clients as unknown as { name: string; phone: string };
        return (
          <Card key={a.id}>
            <CardContent className="flex flex-wrap items-center gap-3 p-4">
              <div className="w-28 font-mono text-sm">{fmt(a.starts_at)} – {fmt(a.ends_at)}</div>
              <div className="min-w-40 flex-1">
                <div className="font-medium">{c.name} · <a className="underline" href={`tel:${c.phone}`}>{c.phone}</a></div>
                <div className="text-sm text-muted-foreground">
                  {(a.services as unknown as { name: string }).name} · {(a.professionals as unknown as { name: string }).name}
                  {a.notes && ` · ${a.notes}`}
                </div>
              </div>
              <Badge variant={a.status === "cancelled" || a.status === "no_show" ? "destructive" : "secondary"}>{LABEL[a.status]}</Badge>
              <form action={setAppointmentStatus} className="flex gap-1">
                <input type="hidden" name="id" value={a.id} />
                {a.status === "pending" && <Button size="xs" name="status" value="confirmed">Confirmar</Button>}
                {(a.status === "pending" || a.status === "confirmed") && (
                  <>
                    <Button size="xs" variant="outline" name="status" value="completed">Completar</Button>
                    <Button size="xs" variant="destructive" name="status" value="cancelled">Cancelar</Button>
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
