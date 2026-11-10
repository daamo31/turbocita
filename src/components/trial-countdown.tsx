"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function TrialCountdown({ endsAt, initialNow }: { endsAt: string; initialNow: number }) {
  const [now, setNow] = useState(initialNow);
  const router = useRouter();
  const end = Date.parse(endsAt);

  useEffect(() => {
    const update = () => {
      const current = Date.now();
      setNow(current);
      if (current >= end) router.refresh();
    };
    update();
    const timer = window.setInterval(update, 60_000);
    const deadline = window.setTimeout(update, Math.max(0, end - Date.now()));
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(deadline);
    };
  }, [end, router]);

  const days = Math.max(0, Math.ceil((end - now) / 86_400_000));
  return (
    <div role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
      {days > 0
        ? <>Prueba Pro: te {days === 1 ? "queda" : "quedan"} <b>{days} {days === 1 ? "día" : "días"}</b>.</>
        : "Tu periodo de prueba ha terminado."}
      {" "}<Link href="/dashboard/plan" className="font-semibold underline">Elegir un plan</Link>
    </div>
  );
}
