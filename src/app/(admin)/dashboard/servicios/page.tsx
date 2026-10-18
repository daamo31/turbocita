import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getContext } from "@/lib/auth";
import { money } from "@/lib/utils";
import { createService, toggleService } from "./actions";

export default async function ServicesPage() {
  const { supabase, business } = await getContext();
  const { data: services } = await supabase.from("services").select("*").order("name");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Servicios</h1>
      <Card>
        <CardHeader><CardTitle>Nuevo servicio</CardTitle></CardHeader>
        <CardContent>
          <form action={createService} className="grid gap-3 sm:grid-cols-4 sm:items-end">
            <div className="space-y-1"><Label>Nombre</Label><Input name="name" required /></div>
            <div className="space-y-1"><Label>Duración (min)</Label><Input name="duration_min" type="number" min={5} defaultValue={30} required /></div>
            <div className="space-y-1"><Label>Precio</Label><Input name="price" type="number" step="0.01" min={0} required /></div>
            <Button type="submit">Añadir</Button>
          </form>
        </CardContent>
      </Card>
      <Table>
        <TableHeader><TableRow><TableHead>Servicio</TableHead><TableHead>Duración</TableHead><TableHead>Precio</TableHead><TableHead>Estado</TableHead><TableHead /></TableRow></TableHeader>
        <TableBody>
          {(services ?? []).map((s) => (
            <TableRow key={s.id}>
              <TableCell>{s.name}</TableCell>
              <TableCell>{s.duration_min} min</TableCell>
              <TableCell>{money(Number(s.price), business.currency)}</TableCell>
              <TableCell><Badge variant={s.active ? "secondary" : "outline"}>{s.active ? "Activo" : "Inactivo"}</Badge></TableCell>
              <TableCell>
                <form action={toggleService}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="active" value={String(!s.active)} />
                  <Button size="xs" variant="outline">{s.active ? "Desactivar" : "Activar"}</Button>
                </form>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
