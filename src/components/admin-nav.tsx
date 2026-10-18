"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Package, Palette, Receipt, Scissors, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/dashboard/servicios", label: "Servicios", icon: Scissors },
  { href: "/dashboard/equipo", label: "Equipo", icon: Users },
  { href: "/dashboard/inventario", label: "Inventario", icon: Package },
  { href: "/dashboard/facturacion", label: "Facturas", icon: Receipt },
  { href: "/dashboard/apariencia", label: "Apariencia", icon: Palette },
] as const;

// Móvil: barra inferior fija (pulgar). Escritorio (md+): barra lateral.
export function AdminNav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* Barra inferior (móvil/tablet pequeña) */}
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="grid grid-cols-6">
          {NAV.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive(href) ? "page" : undefined}
                className={cn(
                  // min-h-14 (56px) > 44px de área táctil mínima
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 px-0.5 text-[10px] font-medium",
                  isActive(href) ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="size-5" />
                <span className="max-w-full truncate">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Barra lateral (md+) */}
      <nav aria-label="Navegación principal" className="hidden w-52 shrink-0 md:block">
        <ul className="sticky top-20 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive(href) ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted",
                  isActive(href) && "bg-muted text-primary"
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
