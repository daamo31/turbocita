import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FEATURE_LABEL, FEATURE_MIN_PLAN, PLANS, type Feature } from "@/lib/plans";

export function UpgradeCard({ feature }: { feature: Feature }) {
  const min = PLANS[FEATURE_MIN_PLAN[feature]];
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">{FEATURE_LABEL[feature]}</h1>
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <Lock className="size-8 text-muted-foreground" aria-hidden />
          <p className="font-semibold">Disponible desde el plan {min.name} ({min.monthly} €/mes)</p>
          <p className="max-w-md text-sm text-muted-foreground">{min.audience}. {min.features.join(" · ")}.</p>
          <Link href="/dashboard/plan"><Button>Ver planes</Button></Link>
        </CardContent>
      </Card>
    </div>
  );
}
