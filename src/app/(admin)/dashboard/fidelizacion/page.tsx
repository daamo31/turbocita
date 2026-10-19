import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { getContext } from "@/lib/auth";
import { LoyaltyCard } from "@/components/loyalty-card";
import { deactivateLoyaltyProgram, saveLoyaltyProgram } from "./actions";
import { TierEditor } from "./tier-editor";

type Tier = { stamps: number; discount_percent: number; description: string };

export default async function LoyaltyPage() {
  const { supabase, business, role } = await getContext();
  const [{ data: program }, { data: services }] = await Promise.all([
    supabase.from("loyalty_programs").select("id, service_id, loyalty_tiers(stamps, discount_percent, description)").eq("is_active", true).maybeSingle(),
    supabase.from("services").select("id, name").eq("active", true).order("name"),
  ]);
  const { data: cards } = program
    ? await supabase
        .from("client_loyalty_cards")
        .select("id, current_stamps, total_rewards_earned, clients(name, phone), loyalty_rewards(id, discount_percent, description, status)")
        .eq("program_id", program.id)
        .order("updated_at", { ascending: false })
        .limit(100)
    : { data: [] };

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
            <form action={saveLoyaltyProgram} className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1"><Label>Servicio aplicable</Label>
                <select name="service_id" defaultValue={program?.service_id ?? ""} className="h-11 w-full rounded-lg border bg-background px-2.5 text-sm md:h-8">
                  <option value="">Todos los servicios</option>
                  {(services ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select></div>
              <TierEditor initial={tiers} />
            </form>
            {program && (
              <form action={deactivateLoyaltyProgram} className="mt-3">
                <input type="hidden" name="id" value={program.id} />
                <Button type="submit" variant="destructive" size="sm">Desactivar programa</Button>
              </form>
            )}
          </CardContent>
        </Card>
      ) : !program && <p className="text-muted-foreground">No hay programa de fidelización activo.</p>}

      {program && (
        <>
          <h2 className="font-semibold">Clientes con tarjeta <Badge variant="secondary">{cards?.length ?? 0}</Badge></h2>
          {(cards ?? []).length === 0 && <p className="text-sm text-muted-foreground">Los sellos aparecerán al completar citas.</p>}
          <div className="grid gap-4 md:grid-cols-2">
            {(cards ?? []).map((c) => {
              const cl = c.clients as unknown as { name: string; phone: string };
              return (
                <div key={c.id} className="space-y-1">
                  <div className="text-sm font-medium">{cl.name} · {cl.phone}</div>
                  <LoyaltyCard
                    businessName={business.name}
                    tiers={tiers}
                    currentStamps={c.current_stamps}
                    rewards={(c.loyalty_rewards as unknown as { id: string; discount_percent: number; description: string; status: string }[]).filter((r) => r.status === "available")}
                    totalRewardsEarned={c.total_rewards_earned}
                  />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
