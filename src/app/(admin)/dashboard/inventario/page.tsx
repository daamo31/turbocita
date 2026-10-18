import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getContext } from "@/lib/auth";
import { money } from "@/lib/utils";
import { adjustStock, createProduct } from "./actions";

export default async function InventoryPage() {
  const { supabase, business } = await getContext();
  const { data: products } = await supabase.from("products").select("*").order("name");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Inventario</h1>
      <Card>
        <CardHeader><CardTitle>Nuevo producto</CardTitle></CardHeader>
        <CardContent>
          <form action={createProduct} className="grid gap-3 sm:grid-cols-6 sm:items-end">
            <div className="space-y-1 sm:col-span-2"><Label>Nombre</Label><Input name="name" required /></div>
            <div className="space-y-1"><Label>SKU</Label><Input name="sku" /></div>
            <div className="space-y-1"><Label>Precio</Label><Input name="price" type="number" step="0.01" min={0} required /></div>
            <div className="space-y-1"><Label>Stock</Label><Input name="stock" type="number" min={0} defaultValue={0} /></div>
            <div className="space-y-1"><Label>Mínimo</Label><Input name="min_stock" type="number" min={0} defaultValue={0} /></div>
            <Button type="submit" className="sm:col-span-6 sm:w-fit">Añadir</Button>
          </form>
        </CardContent>
      </Card>
      <Table>
        <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>Precio</TableHead><TableHead>Stock</TableHead><TableHead>Ajustar (+/−)</TableHead></TableRow></TableHeader>
        <TableBody>
          {(products ?? []).map((p) => (
            <TableRow key={p.id}>
              <TableCell>{p.name}{p.sku && <span className="ml-2 text-xs text-muted-foreground">{p.sku}</span>}</TableCell>
              <TableCell>{money(Number(p.price), business.currency)}</TableCell>
              <TableCell>
                {p.stock} {p.stock <= p.min_stock && <Badge variant="destructive" className="ml-1">Bajo</Badge>}
              </TableCell>
              <TableCell>
                <form action={adjustStock} className="flex gap-1">
                  <input type="hidden" name="id" value={p.id} />
                  <Input name="delta" type="number" defaultValue={1} className="h-7 w-20" />
                  <Button size="xs" variant="outline">Aplicar</Button>
                </form>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
