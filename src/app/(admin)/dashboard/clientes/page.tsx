import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getContext } from "@/lib/auth";
import { anonymizeClient } from "./actions";
import { ConfirmButton } from "./confirm-button";

const PAGE_SIZE = 25;

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; msg?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").replace(/[,()%*\\]/g, " ").trim().slice(0, 40);
  const page = Math.max(1, Number(sp.page) || 1);
  const { supabase } = await getContext();

  let query = supabase
    .from("clients")
    .select("id, name, phone, email, privacy_consent_at, anonymized_at", { count: "exact" })
    .is("anonymized_at", null)
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (q) query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`);
  const { data: clients, count } = await query;
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const href = (p: number) => `?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Clientes</h1>
      <p className="text-sm text-muted-foreground">
        Protección de datos: descarga los datos de un cliente (derecho de acceso) o anonimízalo si pide que borres sus datos. Se conservan las citas y sus importes, pero sin identificarle.
      </p>
      {sp.msg && <p className="rounded-lg bg-muted p-3 text-sm">{sp.msg}</p>}

      <form className="flex gap-2">
        <Input name="q" defaultValue={q} placeholder="Buscar nombre, teléfono o email" className="h-11 md:h-8" />
        <Button type="submit" variant="outline">Buscar</Button>
      </form>

      {(clients ?? []).length === 0 && <p className="text-sm text-muted-foreground">{q ? "Sin resultados." : "Aún no hay clientes."}</p>}
      <Card>
        <ul className="divide-y">
          {(clients ?? []).map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1 basis-48">
                <div className="truncate text-sm font-medium">{c.name}</div>
                <div className="truncate text-xs text-muted-foreground">{c.phone}{c.email ? ` · ${c.email}` : ""}</div>
                {c.privacy_consent_at
                  ? <Badge variant="secondary" className="mt-1">Consentimiento {new Date(c.privacy_consent_at).toLocaleDateString("es-ES")}</Badge>
                  : <Badge variant="outline" className="mt-1">Sin consentimiento registrado</Badge>}
              </div>
              <div className="flex gap-2">
                <a href={`/dashboard/clientes/${c.id}/export`}>
                  <Button type="button" size="xs" variant="outline">Descargar datos</Button>
                </a>
                <form action={anonymizeClient}>
                  <input type="hidden" name="id" value={c.id} />
                  <ConfirmButton message={`¿Anonimizar a ${c.name}? Se borrarán su nombre, teléfono, email y notas. No se puede deshacer.`}>Anonimizar</ConfirmButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          {page > 1 ? <Link href={href(page - 1)} className="inline-flex min-h-11 items-center text-primary underline">← Anterior</Link> : <span />}
          <span className="text-muted-foreground">Página {page} de {pages}</span>
          {page < pages ? <Link href={href(page + 1)} className="inline-flex min-h-11 items-center text-primary underline">Siguiente →</Link> : <span />}
        </div>
      )}
    </div>
  );
}
