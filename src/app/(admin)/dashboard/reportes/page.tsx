import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UpgradeCard } from "@/components/upgrade-card";
import { getContext } from "@/lib/auth";
import { hasFeature } from "@/lib/plans";
import { money } from "@/lib/utils";

const DAYS = 30;

type Appt = {
  status: string;
  client_id: string;
  professionals: { name: string } | null;
  appointment_services: { name: string; price: number | string }[];
};
type Tally = Map<string, { n: number; amount: number }>;

function add(m: Tally, key: string, amount: number) {
  const cur = m.get(key) ?? { n: 0, amount: 0 };
  m.set(key, { n: cur.n + 1, amount: cur.amount + amount });
}

export default async function ReportsPage() {
  const { supabase, business, plan } = await getContext();
  if (!hasFeature(plan, "reports")) return <UpgradeCard feature="reports" />;

  const from = new Date();
  from.setDate(from.getDate() - DAYS);
  const since = from.toISOString();
  const { data } = await supabase
    .from("appointments")
    .select("status, client_id, professionals(name), appointment_services(name, price)")
    .eq("business_id", business.id)
    .gte("starts_at", since)
    .limit(5000);

  const rows = (data ?? []) as unknown as Appt[];
  const done = rows.filter((a) => a.status === "completed");
  const value = (a: Appt) => a.appointment_services.reduce((s, x) => s + Number(x.price), 0);
  const revenue = done.reduce((s, a) => s + value(a), 0);
  const noShows = rows.filter((a) => a.status === "no_show").length;
  const cancelled = rows.filter((a) => a.status === "cancelled").length;
  const clients = new Set(done.map((a) => a.client_id)).size;

  const byService: Tally = new Map();
  const byPro: Tally = new Map();
  for (const a of done) {
    for (const s of a.appointment_services) add(byService, s.name, Number(s.price));
    add(byPro, a.professionals?.name ?? "—", value(a));
  }
  const top = (m: Tally) => [...m.entries()].sort((a, b) => b[1].amount - a[1].amount).slice(0, 8);

  const kpis = [
    { label: "Ingresos", value: money(revenue, business.currency) },
    { label: "Citas completadas", value: String(done.length) },
    { label: "Clientes atendidos", value: String(clients) },
    { label: "Ticket medio", value: done.length ? money(revenue / done.length, business.currency) : "—" },
    { label: "No presentados", value: rows.length ? `${noShows} (${Math.round((noShows / rows.length) * 100)} %)` : "0" },
    { label: "Canceladas", value: String(cancelled) },
  ];

  const table = (title: string, first: string, m: Tally) => (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow><TableHead>{first}</TableHead><TableHead className="text-right">Citas</TableHead><TableHead className="text-right">Importe</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {top(m).map(([name, v]) => (
              <TableRow key={name}>
                <TableCell>{name}</TableCell><TableCell className="text-right">{v.n}</TableCell>
                <TableCell className="text-right">{money(v.amount, business.currency)}</TableCell>
              </TableRow>
            ))}
            {!m.size && <TableRow><TableCell colSpan={3} className="text-muted-foreground">Sin datos todavía.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Reportes · últimos {DAYS} días</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="py-4">
              <div className="text-xs text-muted-foreground">{k.label}</div>
              <div className="text-2xl font-bold tabular-nums">{k.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {table("Servicios más vendidos", "Servicio", byService)}
        {table("Rendimiento por profesional", "Profesional", byPro)}
      </div>
    </div>
  );
}
