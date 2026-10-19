import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getContext } from "@/lib/auth";
import { addProfessional, removeProfessional, saveBusinessSchedule } from "./actions";
import { ScheduleEditor, type Schedule } from "./schedule-editor";

export default async function TeamPage() {
  const { supabase, business, role } = await getContext();
  const [{ count }, { data: biz }] = await Promise.all([
    supabase.from("professionals").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("active", true),
    supabase.from("businesses").select("default_schedule").eq("id", business.id).single(),
  ]);
  const n = count ?? 0;
  const defaultSchedule = (biz?.default_schedule ?? {}) as Schedule;
  const hasDefault = Object.keys(defaultSchedule).length > 0;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Equipo</h1>

      <Card>
        <CardHeader><CardTitle>Profesionales trabajando</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center gap-6">
            <form action={removeProfessional}>
              <Button type="submit" variant="outline" size="lg" className="size-14 rounded-full text-2xl" disabled={n <= 1} aria-label="Quitar un profesional">−</Button>
            </form>
            <div className="text-center">
              <div className="text-5xl font-bold tabular-nums">{n}</div>
              <div className="text-xs text-muted-foreground">{n === 1 ? "profesional" : "profesionales"}</div>
            </div>
            <form action={addProfessional}>
              <Button type="submit" size="lg" className="size-14 rounded-full text-2xl" aria-label="Añadir un profesional">+</Button>
            </form>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Es el máximo de citas simultáneas: cada profesional atiende una cita a la vez. Con {n}, a cualquier hora (no solo a las 11:00)
            puede haber hasta {n} {n === 1 ? "cita" : "citas"} al mismo tiempo. Si hoy hay menos gente, ajusta el número.
          </p>
        </CardContent>
      </Card>

      {role === "owner" && (
        <Card>
          <CardHeader><CardTitle>Horario del negocio</CardTitle></CardHeader>
          <CardContent>
            {!hasDefault && <p className="mb-3 rounded-lg bg-amber-100 p-3 text-sm text-amber-900">Define el horario para que los clientes puedan reservar.</p>}
            <details open={!hasDefault}>
              <summary className="mb-3 flex min-h-11 cursor-pointer items-center text-sm text-muted-foreground">
                {hasDefault ? "Es el horario de todos los profesionales. Pulsa para editarlo." : "Días y tramos en los que abres."}
              </summary>
              <form action={saveBusinessSchedule} className="space-y-3">
                <ScheduleEditor initial={defaultSchedule} />
                <Button type="submit" className="w-full sm:w-auto">Guardar horario</Button>
              </form>
            </details>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
