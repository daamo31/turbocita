import { getContext } from "@/lib/auth";
import { DocumentForm } from "./document-form";

export default async function NewDocumentPage({ searchParams }: PageProps<"/dashboard/facturacion/nuevo">) {
  const { supabase, business } = await getContext();
  const { error } = await searchParams;
  const [{ data: clients }, { data: services }, { data: products }] = await Promise.all([
    supabase.from("clients").select("id, name, phone").order("name"),
    supabase.from("services").select("id, name, price").eq("active", true).order("name"),
    supabase.from("products").select("id, name, price").eq("active", true).order("name"),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Nuevo documento</h1>
      {typeof error === "string" && <p className="text-sm text-destructive">{error}</p>}
      <DocumentForm
        currency={business.currency}
        clients={clients ?? []}
        catalog={[
          ...(services ?? []).map((s) => ({ name: s.name, price: Number(s.price) })),
          ...(products ?? []).map((p) => ({ name: p.name, price: Number(p.price) })),
        ]}
      />
    </div>
  );
}
