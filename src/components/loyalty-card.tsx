import { Check, Gift, Percent } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Tier { stamps: number; discount_percent: number; description: string }
interface Reward { id: string; discount_percent: number; description: string }

interface Props {
  businessName: string;
  tiers: Tier[];
  currentStamps: number;
  rewards: Reward[];
  totalRewardsEarned?: number;
  className?: string;
}

export const rewardLabel = (pct: number) => (pct >= 100 ? "Gratis" : `${pct}% dto.`);

// Tarjeta de fidelización digital: un círculo por sello; los niveles se marcan con su premio.
export function LoyaltyCard({ businessName, tiers, currentStamps, rewards, totalRewardsEarned = 0, className }: Props) {
  const sorted = [...tiers].sort((a, b) => a.stamps - b.stamps);
  const total = sorted.at(-1)?.stamps ?? 1;
  const filled = Math.min(currentStamps, total);
  const next = sorted.find((t) => t.stamps > filled);
  const tierAt = new Map(sorted.map((t) => [t.stamps, t]));

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="bg-primary text-primary-foreground">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="truncate">{businessName}</CardTitle>
          <Badge variant="secondary" className="shrink-0">{filled}/{total}</Badge>
        </div>
        <ul className="text-sm opacity-90">
          {sorted.map((t) => <li key={t.stamps}>{t.stamps} sellos → {t.description}</li>)}
        </ul>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <ol
          className="grid grid-cols-5 gap-2 sm:gap-3"
          aria-label={`${filled} de ${total} sellos conseguidos`}
        >
          {Array.from({ length: total }, (_, i) => {
            const n = i + 1;
            const done = n <= filled;
            const tier = tierAt.get(n);
            return (
              <li
                key={n}
                aria-label={`Sello ${n} ${done ? "conseguido" : "pendiente"}${tier ? `, premio: ${tier.description}` : ""}`}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center rounded-full border-2 text-[10px] font-semibold leading-none transition-all duration-300",
                  done ? "border-primary bg-primary text-primary-foreground" : "border-dashed border-muted-foreground/40 text-muted-foreground",
                  tier && !done && "border-primary/70 text-primary"
                )}
              >
                {done ? <Check className="size-1/2" strokeWidth={3} /> : tier ? (tier.discount_percent >= 100 ? <Gift className="size-1/2" /> : <Percent className="size-1/2" />) : n}
                {tier && <span className="mt-0.5">{rewardLabel(tier.discount_percent)}</span>}
              </li>
            );
          })}
        </ol>

        {rewards.length > 0 && (
          <div className="space-y-2">
            {rewards.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-lg border border-primary bg-primary/10 p-3">
                <Gift className="size-6 shrink-0 text-primary" />
                <div className="text-sm">
                  <div className="font-semibold">¡Recompensa disponible: {r.description}!</div>
                  <div className="text-muted-foreground">Pídela en tu próxima visita ({rewardLabel(r.discount_percent)}).</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {next && (
          <p className="text-sm text-muted-foreground">
            {next.stamps - filled === 1 ? "Te falta 1 sello" : `Te faltan ${next.stamps - filled} sellos`} para: {next.description}.
          </p>
        )}
        {totalRewardsEarned > 0 && <p className="text-xs text-muted-foreground">Recompensas ganadas en total: {totalRewardsEarned}</p>}
      </CardContent>
    </Card>
  );
}
