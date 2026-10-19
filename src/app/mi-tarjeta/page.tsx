import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoyaltyCard } from "@/components/loyalty-card";
import { createClient } from "@/lib/supabase/server";
import { sendClientLink } from "./actions";

export const metadata = { title: "Mi tarjeta de fidelización" };

// Portal del cliente: RLS garantiza que solo ve sus propias tarjetas (auth.uid() = clients.auth_user_id).
export default async function MyCardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const slug = typeof sp.negocio === "string" && /^[a-z0-9-]{3,40}$/.test(sp.negocio) ? sp.negocio : "";
  const error = typeof sp.error === "string" ? sp.error : null;
  const sent = sp.sent === "1";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-md space-y-4 p-4">
        <Card>
          <CardHeader><CardTitle>Mi tarjeta de fidelización</CardTitle></CardHeader>
          <CardContent>
            {sent ? (
              <p role="status" className="text-sm">Te hemos enviado un enlace. Ábrelo desde tu email para ver tus sellos.</p>
            ) : (
              <form action={sendClientLink} className="space-y-3">
                <input type="hidden" name="negocio" value={slug} />
                <div className="space-y-1">
                  <Label htmlFor="email">Email que usaste al reservar</Label>
                  <Input id="email" name="email" type="email" autoComplete="email" required />
                </div>
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full">Recibir enlace de acceso</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    );
  }

  if (slug) {
    const { data: biz } = await supabase.from("businesses").select("id").eq("slug", slug).maybeSingle();
    if (biz) await supabase.rpc("link_client_account", { p_business: biz.id });
  }

  const { data: cards } = await supabase
    .from("client_loyalty_cards")
    .select("id, current_stamps, total_rewards_earned, loyalty_programs(loyalty_tiers(stamps, discount_percent, description)), clients(business_id), loyalty_rewards(id, discount_percent, description, status)")
    .order("updated_at", { ascending: false });

  const businessIds = [...new Set((cards ?? []).map((c) => (c.clients as unknown as { business_id: string }).business_id))];
  const { data: businesses } = businessIds.length
    ? await supabase.from("businesses").select("id, name").in("id", businessIds)
    : { data: [] };
  const names = new Map((businesses ?? []).map((b) => [b.id, b.name]));

  return (
    <main className="mx-auto max-w-md space-y-4 p-4">
      <h1 className="text-xl font-bold">Mi tarjeta de fidelización</h1>
      {(cards ?? []).length === 0 && (
        <p className="text-muted-foreground">Aún no tienes sellos. Se sumarán cuando completes tus citas con el mismo email o teléfono verificado.</p>
      )}
      {(cards ?? []).map((c) => {
        const p = c.loyalty_programs as unknown as { loyalty_tiers: { stamps: number; discount_percent: number; description: string }[] };
        const rewards = (c.loyalty_rewards as unknown as { id: string; discount_percent: number; description: string; status: string }[]).filter((r) => r.status === "available");
        const bid = (c.clients as unknown as { business_id: string }).business_id;
        return (
          <LoyaltyCard
            key={c.id}
            businessName={names.get(bid) ?? "Negocio"}
            tiers={p.loyalty_tiers}
            currentStamps={c.current_stamps}
            rewards={rewards}
            totalRewardsEarned={c.total_rewards_earned}
          />
        );
      })}
    </main>
  );
}
