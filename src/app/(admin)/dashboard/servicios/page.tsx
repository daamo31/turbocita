import { ActionForm, SubmitButton } from "@/components/action-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getContext } from "@/lib/auth";
import { money } from "@/lib/utils";
import { createService, deleteService, toggleService } from "./actions";

export default async function ServicesPage() {
  const { supabase, business } = await getContext();
  const { data: services } = await supabase.from("services").select("*").order("name");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Servicios</h1>
      <p className="text-sm text-muted-foreground">Eliminar borra el servicio. Si ya tiene citas, se desactiva para conservar el historial.</p>
      <Card>
        <CardHeader><CardTitle>Nuevo servicio</CardTitle></CardHeader>
        <CardContent>
          <ActionForm action={createService} success="Servicio creado ✓" className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:items-end">
            <div className="col-span-2 space-y-1 sm:col-span-1"><Label>Nombre</Label><Input name="name" required /></div>
            <div className="space-y-1"><Label>Duración (min)</Label><Input name="duration_min" type="number" min={5} defaultValue={30} required /></div>
            <div className="space-y-1"><Label>Precio</Label><Input name="price" type="number" step="0.01" min={0} required /></div>
            <SubmitButton className="col-span-2 sm:col-span-1">Añadir</SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>
      {/* Móvil: tarjetas */}
      <ul className="space-y-3 md:hidden">
        {(services ?? []).map((s) => (
          <li key={s.id}>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="break-words font-medium">{s.name}</div>
                  <div className="text-sm text-muted-foreground">{s.duration_min} min · {money(Number(s.price), business.currency)}</div>
                  <Badge className="mt-1" variant={s.active ? "secondary" : "outline"}>{s.active ? "Activo" : "Inactivo"}</Badge>
                </div>
                <div className="flex flex-col gap-2">
                  <ActionForm action={toggleService} success="Estado del servicio actualizado">
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="active" value={String(!s.active)} />
                    <SubmitButton size="xs" variant="outline" className="w-full">{s.active ? "Desactivar" : "Activar"}</SubmitButton>
                  </ActionForm>
                  <ActionForm action={deleteService} success="Servicio eliminado">
                  <input type="hidden" name="id" value={s.id} />
                  <SubmitButton size="xs" variant="destructive" className="w-full">Eliminar</SubmitButton>
                </ActionForm>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      {/* Tablet/escritorio: tabla */}
      <div className="hidden md:block">
        <Table>
          <TableHeader><TableRow><TableHead>Servicio</TableHead><TableHead>Duración</TableHead><TableHead>Precio</TableHead><TableHead>Estado</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {(services ?? []).map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.name}</TableCell>
                <TableCell>{s.duration_min} min</TableCell>
                <TableCell>{money(Number(s.price), business.currency)}</TableCell>
                <TableCell><Badge variant={s.active ? "secondary" : "outline"}>{s.active ? "Activo" : "Inactivo"}</Badge></TableCell>
                <TableCell className="flex gap-2">
                  <ActionForm action={toggleService} success="Estado del servicio actualizado">
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="active" value={String(!s.active)} />
                    <SubmitButton size="xs" variant="outline">{s.active ? "Desactivar" : "Activar"}</SubmitButton>
                  </ActionForm>
                  <ActionForm action={deleteService} success="Servicio eliminado">
                  <input type="hidden" name="id" value={s.id} />
                  <SubmitButton size="xs" variant="destructive">Eliminar</SubmitButton>
                </ActionForm>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
