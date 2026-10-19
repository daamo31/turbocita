import { ActionForm, SubmitButton } from "@/components/action-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { getContext } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { deactivateLoyaltyProgram, saveLoyaltyProgram } from "./actions";
import { TierEditor } from "./tier-editor";

type Tier = { stamps: number; discount_percent: number; description: string };

const PAGE_SIZE = 25;

export default async function LoyaltyPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").replace(/[,()%*\\]/g, " ").trim().slice(0, 40);
  const page = Math.max(1, Number(sp.page) || 1);
  const { supabase, role } = await getContext();
  const [{ data: program }, { data: services }] = await Promise.all([
    supabase.from("loyalty_programs").select("id, service_id, loyalty_tiers(stamps, discount_percent, description)").eq("is_active", true).maybeSingle(),
    supabase.from("services").select("id, name").eq("active", true).order("name"),
  ]);
  let cardsQuery = supabase
    .from("client_loyalty_cards")
    .select("id, current_stamps, rewards_available, total_rewards_earned, clients!inner(name, phone)", { count: "exact" })
    .eq("program_id", program?.id ?? "00000000-0000-0000-0000-000000000000")
    .order("current_stamps", { ascending: false })
    .order("updated_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (q) cardsQuery = cardsQuery.or(`name.ilike.%${q}%,phone.ilike.%${q}%`, { referencedTable: "clients" });
  const { data: cards, count } = program ? await cardsQuery : { data: [], count: 0 };
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const maxStamps = Math.max(1, ...((program?.loyalty_tiers as unknown as Tier[] | null) ?? []).map((t) => t.stamps));
  const href = (p: number) => `?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  const tiers = [...((program?.loyalty_tiers as unknown as Tier[] | null) ?? [])].sort((a, b) => a.stamps - b.stamps);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Fidelización</h1>

      {role === "owner" ? (
        <Card>
          <CardHeader>
            <CardTitle>{program ? "Programa activo" : "Crear programa"}</CardTitle>
            {program && <p className="text-sm text-muted-foreground">Guardar uno nuevo sustituye al actual; las tarjetas ya creadas se conservan.</p>}
          </CardHeader>
          <CardContent>
            <ActionForm action={saveLoyaltyProgram} success="Programa de fidelización guardado ✓" className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1"><Label>Servicio aplicable</Label>
                <select name="service_id" defaultValue={program?.service_id ?? ""} className="h-11 w-full rounded-lg border bg-background px-2.5 text-sm md:h-8">
                  <option value="">Todos los servicios</option>
                  {(services ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select></div>
              <TierEditor initial={tiers} />
            </ActionForm>
            {program && (
              <ActionForm action={deactivateLoyaltyProgram} success="Programa desactivado" className="mt-3">
                <input type="hidden" name="id" value={program.id} />
                <SubmitButton variant="destructive" size="sm">Desactivar programa</SubmitButton>
              </ActionForm>
            )}
          </CardContent>
        </Card>
      ) : !program && <p className="text-muted-foreground">No hay programa de fidelización activo.</p>}

      {program && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">Clientes con tarjeta <Badge variant="secondary">{count ?? 0}</Badge></h2>
            <form className="flex gap-2">
              <Input name="q" defaultValue={q} placeholder="Buscar nombre o teléfono" className="h-11 w-full sm:w-64 md:h-8" />
              <Button type="submit" variant="outline">Buscar</Button>
            </form>
          </div>
          {(cards ?? []).length === 0 && <p className="text-sm text-muted-foreground">{q ? "Sin resultados." : "Los sellos aparecerán al completar citas."}</p>}
          <Card>
            <ul className="divide-y">
              {(cards ?? []).map((c) => {
                const cl = c.clients as unknown as { name: string; phone: string };
                return (
                  <li key={c.id} className="flex items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{cl.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{cl.phone}</div>
                    </div>
                    <div className="w-24 shrink-0 sm:w-40">
                      <div className="flex items-center justify-between text-xs tabular-nums">
                        <span className="font-semibold">{c.current_stamps}/{maxStamps}</span>
                        {c.rewards_available > 0 && <Badge className="bg-amber-400 text-white">🎁 {c.rewards_available}</Badge>}
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (c.current_stamps / maxStamps) * 100)}%` }} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
          {pages > 1 && (
            <div className="flex items-center justify-between text-sm">
              {page > 1 ? <Link href={href(page - 1)} className="inline-flex min-h-11 items-center text-primary underline">← Anterior</Link> : <span />}
              <span className="text-muted-foreground">Página {page} de {pages}</span>
              {page < pages ? <Link href={href(page + 1)} className="inline-flex min-h-11 items-center text-primary underline">Siguiente →</Link> : <span />}
            </div>
          )}
        </>
      )}
    </div>
  );
}
