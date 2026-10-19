import { Gift, Sparkles, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StampTier { stamps: number; discount_percent: number; description: string }

interface Props {
  businessName: string;
  tiers: StampTier[];
  currentStamps: number;
  rewardsAvailable: number;
  // Citas ya reservadas que sellarán al completarse
  upcoming?: number;
  // La reserva que se está haciendo ahora (aún sin confirmar)
  pendingVisit?: boolean;
  className?: string;
}

const label = (pct: number) => (pct >= 100 ? "GRATIS" : `-${pct}%`);
const CONFETTI = ["#f43f5e", "#f59e0b", "#10b981", "#3b82f6", "#a855f7", "#eab308"];

function Confetti() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 overflow-hidden">
      {Array.from({ length: 22 }, (_, i) => (
        <span
          key={i}
          className="confetti-piece absolute top-0 block h-2.5 w-1.5 rounded-[1px]"
          style={{
            left: `${(i * 4.7 + 3) % 100}%`,
            backgroundColor: CONFETTI[i % CONFETTI.length],
            ["--d" as string]: `${(i % 7) * 120}ms`,
            ["--cx" as string]: `${((i % 5) - 2) * 14}px`,
            ["--cr" as string]: `${(i % 2 ? 1 : -1) * (240 + i * 20)}deg`,
          }}
        />
      ))}
    </div>
  );
}

// Cartón de sellos: una casilla por sello, premios marcados, y celebración cuando hay premio disponible.
export function StampCard({ businessName, tiers, currentStamps, rewardsAvailable, upcoming = 0, pendingVisit, className }: Props) {
  const sorted = [...tiers]
    .map((t) => ({ ...t, description: t.description?.trim() || (t.discount_percent >= 100 ? "Servicio gratis" : `${t.discount_percent}% de descuento`) }))
    .sort((a, b) => a.stamps - b.stamps);
  const total = sorted.at(-1)?.stamps ?? 1;
  const filled = Math.min(currentStamps, total);
  const tierAt = new Map(sorted.map((t) => [t.stamps, t]));
  const next = sorted.find((t) => t.stamps > filled);
  const pendingCount = Math.min(upcoming + (pendingVisit ? 1 : 0), total - filled);
  const lastPending = filled + pendingCount;
  const willWin = pendingCount > 0 ? sorted.find((t) => t.stamps > filled && t.stamps <= lastPending) : undefined;

  return (
    <section
      aria-label={`Tarjeta de sellos de ${businessName}: ${filled} de ${total}`}
      className={cn("relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-card shadow-sm", className)}
    >
      {rewardsAvailable > 0 && <Confetti />}

      <header className="relative flex items-center justify-between gap-3 bg-primary px-4 py-3 text-primary-foreground">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-widest opacity-80">Tarjeta de fidelización</div>
          <div className="truncate font-bold">{businessName}</div>
        </div>
        <div className="shrink-0 rounded-full bg-primary-foreground/20 px-3 py-1 text-sm font-bold tabular-nums">{filled}/{total}</div>
      </header>

      {rewardsAvailable > 0 && (
        <div className="relative mx-3 mt-3 overflow-hidden rounded-xl bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 p-3 text-white shadow-md">
          <div className="reward-shine absolute inset-0" aria-hidden />
          <div className="relative flex items-center gap-3">
            <Gift className="gift-bounce size-9 shrink-0 drop-shadow" />
            <div className="text-sm leading-tight">
              <div className="text-base font-extrabold">🎉 ¡Tienes {rewardsAvailable === 1 ? "un premio" : `${rewardsAvailable} premios`}!</div>
              <div className="font-medium opacity-95">Díselo al negocio cuando llegues y canjéalo.</div>
            </div>
          </div>
        </div>
      )}

      <div className="p-4">
        {/* Casillas del cartón */}
        <ol className="grid grid-cols-5 gap-2" aria-hidden>
          {Array.from({ length: total }, (_, i) => {
            const n = i + 1;
            const done = n <= filled;
            const pending = n > filled && n <= lastPending;
            const isNew = pendingVisit && n === lastPending;
            const tier = tierAt.get(n);
            return (
              <li
                key={n}
                className={cn(
                  "relative flex aspect-square flex-col items-center justify-center rounded-xl border-2 text-xs font-semibold",
                  done && "border-primary bg-primary/10",
                  !done && !tier && "border-dashed border-muted-foreground/30 text-muted-foreground/60",
                  !done && tier && "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
                  pending && "stamp-pending border-solid !border-primary bg-primary/15 text-primary ring-2 ring-primary/40",
                  isNew && "ring-4 ring-primary/50"
                )}
              >
                {pending && !done ? (
                  <>
                    <Star className="size-1/2" />
                    <span className="mt-0.5 text-[9px] font-extrabold uppercase leading-none">{isNew ? "Esta" : "Reserva"}</span>
                  </>
                ) : done ? (
                  <span
                    className="stamp-in flex size-4/5 items-center justify-center rounded-full border-2 border-primary text-primary"
                    style={{ ["--d" as string]: `${i * 60}ms`, ["--stamp-rot" as string]: `${(i % 3 - 1) * 7}deg` }}
                  >
                    <Star className="size-1/2 fill-current" />
                  </span>
                ) : tier ? (
                  <>
                    <Gift className="size-1/2" />
                    <span className="mt-0.5 text-[9px] font-extrabold leading-none">{label(tier.discount_percent)}</span>
                  </>
                ) : (
                  n
                )}
                {done && tier && (
                  <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-amber-400 text-white">
                    <Gift className="size-2.5" />
                  </span>
                )}
              </li>
            );
          })}
        </ol>

        <div className="mt-4 space-y-2 text-sm">
          {willWin && (
            <p className="flex items-start gap-2 rounded-lg bg-amber-100 p-2.5 font-semibold text-amber-900 dark:bg-amber-400/15 dark:text-amber-200">
              <Sparkles className="mt-0.5 size-4 shrink-0" />
              ¡Al completar la visita ganas: {willWin.description}!
            </p>
          )}
          {pendingCount > 0 && (
            <p className="font-medium text-primary">
              {pendingVisit
                ? upcoming > 0 ? `Con esta reserva y tus ${upcoming} pendiente${upcoming > 1 ? "s" : ""} sumarás ${pendingCount} sellos.` : "Al completar esta visita sumarás un sello."
                : `Tienes ${upcoming} cita${upcoming > 1 ? "s" : ""} reservada${upcoming > 1 ? "s" : ""}: se sellará${upcoming > 1 ? "n" : ""} al completarla${upcoming > 1 ? "s" : ""}.`}
            </p>
          )}
          {!willWin && next && (
            <p className="text-muted-foreground">
              {next.stamps - filled === 1 ? "Te falta 1 sello" : `Te faltan ${next.stamps - filled} sellos`} (sin contar las reservas) para <strong className="text-foreground">{next.description}</strong>.
            </p>
          )}
          {!next && !willWin && rewardsAvailable === 0 && <p className="text-muted-foreground">¡Ciclo completado! Empieza uno nuevo en tu próxima visita.</p>}
          <ul className="flex flex-wrap gap-1.5 pt-1 text-[11px] text-muted-foreground">
            {sorted.map((t) => (
              <li key={t.stamps} className="rounded-full border px-2 py-0.5">{t.stamps} sellos → {t.description}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
