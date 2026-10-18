import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { LayoutKey } from "@/lib/themes";

type Info = {
  name: string; tagline?: string | null; description?: string | null;
  address?: string | null; phone?: string | null; logo_url?: string | null;
};

function Logo({ info, className }: { info: Info; className?: string }) {
  if (info.logo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={info.logo_url} alt={`Logo de ${info.name}`} className={cn("size-20 rounded-2xl bg-white object-contain p-1.5 shadow-md ring-1 ring-black/5", className)} />
    );
  }
  return (
    <div className={cn("flex size-20 items-center justify-center rounded-2xl bg-primary text-3xl font-bold text-primary-foreground shadow-md", className)}>
      {info.name.trim().charAt(0).toUpperCase()}
    </div>
  );
}

function Contact({ info, className }: { info: Info; className?: string }) {
  if (!info.address && !info.phone) return null;
  return (
    <div className={cn("flex flex-wrap gap-2 text-xs", className)}>
      {info.address && <span className="bk-card px-3 py-1">📍 {info.address}</span>}
      {info.phone && <a href={`tel:${info.phone}`} className="bk-card px-3 py-1">📞 {info.phone}</a>}
    </div>
  );
}

// Estructura de la página pública según la plantilla elegida. Se usa también en la vista previa.
export function BookingShell({ layout, info, children, compact }: { layout: LayoutKey; info: Info; children: ReactNode; compact?: boolean }) {
  if (layout === "hero") {
    return (
      <div>
        <div className={cn("relative overflow-hidden bg-gradient-to-br from-primary to-primary/50 text-primary-foreground", compact ? "h-24" : "h-44 sm:h-56")}>
          <div className="absolute -right-10 -top-10 size-48 rounded-full bg-white/10" />
          <div className="absolute -bottom-16 left-10 size-40 rounded-full bg-black/10" />
        </div>
        <div className={cn("mx-auto max-w-2xl px-4", compact && "px-0")}>
          <div className="-mt-10 flex items-end gap-4">
            <Logo info={info} className="size-24 shrink-0" />
            <div className="pb-1">
              <h1 className="bk-title text-2xl font-bold sm:text-3xl">{info.name}</h1>
              {info.tagline && <p className="text-sm font-medium text-muted-foreground">{info.tagline}</p>}
            </div>
          </div>
          {info.description && <p className="mt-4 text-sm text-muted-foreground">{info.description}</p>}
          <Contact info={info} className="mt-3" />
          <div className="mt-6 pb-10">{children}</div>
        </div>
      </div>
    );
  }

  if (layout === "split") {
    return (
      <div className={cn("mx-auto grid max-w-5xl gap-6 px-4 py-8", !compact && "lg:grid-cols-[320px_1fr] lg:gap-10 lg:py-14")}>
        <aside className={cn("space-y-4", !compact && "lg:sticky lg:top-10 lg:self-start")}>
          <div className="bk-card space-y-4 p-6">
            <Logo info={info} />
            <div>
              <h1 className="bk-title text-2xl font-bold">{info.name}</h1>
              {info.tagline && <p className="mt-1 text-sm font-medium text-primary">{info.tagline}</p>}
            </div>
            {info.description && <p className="text-sm text-muted-foreground">{info.description}</p>}
            <Contact info={info} />
          </div>
        </aside>
        <div className="pb-6">{children}</div>
      </div>
    );
  }

  return (
    <main className={cn("mx-auto max-w-2xl px-4 py-10", compact && "px-0 py-0")}>
      <header className="flex flex-col items-center text-center">
        <Logo info={info} />
        <h1 className="bk-title mt-4 text-3xl font-bold">{info.name}</h1>
        {info.tagline && <p className="mt-1 font-medium text-primary">{info.tagline}</p>}
        {info.description && <p className="mt-3 max-w-lg text-sm text-muted-foreground">{info.description}</p>}
        <Contact info={info} className="mt-3 justify-center" />
      </header>
      <div className="mt-8">{children}</div>
    </main>
  );
}
