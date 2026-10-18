import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getContext } from "@/lib/auth";
import { createProfessional, toggleProfessional } from "./actions";

const DAYS = [["1", "L"], ["2", "M"], ["3", "X"], ["4", "J"], ["5", "V"], ["6", "S"], ["0", "D"]];

export default async function TeamPage() {
  const { supabase } = await getContext();
  const [{ data: pros }, { data: services }] = await Promise.all([
    supabase.from("professionals").select("id, name, active, professional_services(services(name))").order("name"),
    supabase.from("services").select("id, name").eq("active", true).order("name"),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Equipo</h1>
      <Card>
        <CardHeader><CardTitle>Nuevo profesional</CardTitle></CardHeader>
        <CardContent>
          <form action={createProfessional} className="space-y-4">
            <div className="space-y-1"><Label>Nombre</Label><Input name="name" required /></div>
            <fieldset className="space-y-1">
              <Label>Servicios que realiza</Label>
              <div className="flex flex-wrap gap-3 text-sm">
                {(services ?? []).map((s) => (
                  <label key={s.id} className="flex items-center gap-1"><input type="checkbox" name="services" value={s.id} /> {s.name}</label>
                ))}
                {(services ?? []).length === 0 && <span className="text-muted-foreground">Crea primero algún servicio.</span>}
              </div>
            </fieldset>
            <fieldset className="space-y-1">
              <Label>Días laborables</Label>
              <div className="flex gap-3 text-sm">
                {DAYS.map(([v, l]) => (
                  <label key={v} className="flex items-center gap-1"><input type="checkbox" name="days" value={v} defaultChecked={v !== "0" && v !== "6"} /> {l}</label>
                ))}
              </div>
            </fieldset>
            <div className="flex gap-3">
              <div className="space-y-1"><Label>Entrada</Label><Input name="start" type="time" defaultValue="09:00" required /></div>
              <div className="space-y-1"><Label>Salida</Label><Input name="end" type="time" defaultValue="18:00" required /></div>
            </div>
            <Button type="submit">Añadir profesional</Button>
          </form>
        </CardContent>
      </Card>

      {(pros ?? []).map((p) => (
        <Card key={p.id}>
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <span className="font-medium">{p.name}</span>
            <Badge variant={p.active ? "secondary" : "outline"}>{p.active ? "Activo" : "Inactivo"}</Badge>
            <span className="flex-1 text-sm text-muted-foreground">
              {(p.professional_services as unknown as { services: { name: string } }[]).map((x) => x.services.name).join(", ")}
            </span>
            <form action={toggleProfessional}>
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="active" value={String(!p.active)} />
              <Button size="xs" variant="outline">{p.active ? "Desactivar" : "Activar"}</Button>
            </form>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
