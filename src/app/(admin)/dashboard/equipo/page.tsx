import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getContext } from "@/lib/auth";
import { createProfessional, saveBusinessSchedule, saveSchedule, toggleProfessional } from "./actions";
import { ScheduleEditor, type Schedule } from "./schedule-editor";

export default async function TeamPage() {
  const { supabase, business, role } = await getContext();
  const [{ data: pros }, { data: services }, { data: biz }] = await Promise.all([
    supabase.from("professionals").select("id, name, active, professional_services(services(name)), working_hours(weekday, start_time, end_time)").order("name"),
    supabase.from("services").select("id, name").eq("active", true).order("name"),
    supabase.from("businesses").select("default_schedule").eq("id", business.id).single(),
  ]);
  const defaultSchedule = (biz?.default_schedule ?? {}) as Schedule;
  const hasDefault = Object.keys(defaultSchedule).length > 0;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Equipo</h1>
      {role === "owner" && (
        <Card>
          <CardHeader><CardTitle>Horario del negocio</CardTitle></CardHeader>
          <CardContent>
            <details open={!hasDefault} className="group">
              <summary className="mb-3 flex min-h-11 cursor-pointer items-center text-sm text-muted-foreground">
                {hasDefault ? "Es el punto de partida al añadir profesionales. Pulsa para editarlo." : "Define cuándo abre tu negocio: se usará como punto de partida al añadir profesionales."}
              </summary>
              <form action={saveBusinessSchedule} className="space-y-3">
                <ScheduleEditor initial={defaultSchedule} />
                <Button type="submit" className="w-full sm:w-auto">Guardar horario del negocio</Button>
              </form>
            </details>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Nuevo profesional</CardTitle></CardHeader>
        <CardContent>
          <form action={createProfessional} className="space-y-4">
            <div className="space-y-1"><Label>Nombre</Label><Input name="name" required /></div>
            <fieldset className="space-y-1">
              <Label>Servicios que realiza</Label>
              <div className="flex flex-wrap gap-2 text-sm">
                {(services ?? []).map((s) => (
                  <label key={s.id} className="flex min-h-11 items-center gap-2 rounded-lg border px-3"><input type="checkbox" name="services" value={s.id} className="size-4" /> {s.name}</label>
                ))}
                {(services ?? []).length === 0 && <span className="text-muted-foreground">Crea primero algún servicio.</span>}
              </div>
            </fieldset>
            <div className="space-y-1">
              <Label>Horario semanal</Label>
              {/* key: al guardar el horario del negocio, el editor se reinicia con el nuevo punto de partida */}
              <ScheduleEditor key={JSON.stringify(defaultSchedule)} initial={defaultSchedule} />
            </div>
            <Button type="submit" className="w-full sm:w-auto">Añadir profesional</Button>
          </form>
        </CardContent>
      </Card>

      {(pros ?? []).map((p) => {
        const sch: Schedule = {};
        for (const h of p.working_hours as { weekday: number; start_time: string; end_time: string }[]) {
          (sch[h.weekday] ??= []).push({ start: h.start_time.slice(0, 5), end: h.end_time.slice(0, 5) });
        }
        for (const d of Object.keys(sch)) sch[d].sort((x, y) => x.start.localeCompare(y.start));
        return (
          <Card key={p.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-medium">{p.name}</span>
                <Badge variant={p.active ? "secondary" : "outline"}>{p.active ? "Activo" : "Inactivo"}</Badge>
                <span className="w-full flex-1 text-sm text-muted-foreground sm:w-auto">
                  {(p.professional_services as unknown as { services: { name: string } }[]).map((x) => x.services.name).join(", ")}
                </span>
                <form action={toggleProfessional}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="active" value={String(!p.active)} />
                  <Button type="submit" size="xs" variant="outline">{p.active ? "Desactivar" : "Activar"}</Button>
                </form>
              </div>
              <details className="group rounded-lg border">
                <summary className="flex min-h-11 cursor-pointer items-center justify-between px-3 text-sm font-medium">
                  Horario
                  <span className="text-xs font-normal text-muted-foreground group-open:hidden">Editar</span>
                </summary>
                <form action={saveSchedule} className="space-y-3 border-t p-3">
                  <input type="hidden" name="id" value={p.id} />
                  <ScheduleEditor initial={sch} />
                  <Button type="submit" className="w-full sm:w-auto">Guardar horario</Button>
                </form>
              </details>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
