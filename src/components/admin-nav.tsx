"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Gift, MoreHorizontal, Package, Palette, Receipt, Scissors, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/dashboard/servicios", label: "Servicios", icon: Scissors },
  { href: "/dashboard/equipo", label: "Equipo", icon: Users },
  { href: "/dashboard/fidelizacion", label: "Fidelización", icon: Gift },
  { href: "/dashboard/inventario", label: "Inventario", icon: Package },
  { href: "/dashboard/facturacion", label: "Facturas", icon: Receipt },
  { href: "/dashboard/apariencia", label: "Apariencia", icon: Palette },
] as const;

const MAIN = NAV.slice(0, 3); // fijos en la barra móvil
const MORE = NAV.slice(3); // dentro de "Más"

// Móvil: barra inferior con 3 accesos + "Más" (hoja con el resto). Escritorio (md+): barra lateral.
export function AdminNav() {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname; // al navegar, la hoja se cierra sola
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const moreActive = MORE.some((m) => isActive(m.href));

  const tab = "flex min-h-14 flex-col items-center justify-center gap-0.5 px-0.5 text-[10px] font-medium";

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Más opciones">
          <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-black/40" onClick={() => setOpenPath(null)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-lg">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold">Más</span>
              <button type="button" aria-label="Cerrar" className="flex size-11 items-center justify-center rounded-lg hover:bg-muted" onClick={() => setOpenPath(null)}>
                <X className="size-5" />
              </button>
            </div>
            <ul className="grid grid-cols-2 gap-2">
              {MORE.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={isActive(href) ? "page" : undefined}
                    className={cn("flex min-h-12 items-center gap-3 rounded-lg border px-3 text-sm font-medium", isActive(href) && "border-primary bg-muted text-primary")}
                  >
                    <Icon className="size-5" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Barra inferior (móvil/tablet pequeña) */}
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="grid grid-cols-4">
          {MAIN.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive(href) ? "page" : undefined}
                className={cn(tab, isActive(href) ? "text-primary" : "text-muted-foreground")}
              >
                <Icon className="size-5" />
                <span className="max-w-full truncate">{label}</span>
              </Link>
            </li>
          ))}
          <li>
            <button
              type="button"
              aria-expanded={open}
              aria-haspopup="dialog"
              onClick={() => setOpenPath(open ? null : pathname)}
              className={cn(tab, "w-full", moreActive || open ? "text-primary" : "text-muted-foreground")}
            >
              <MoreHorizontal className="size-5" />
              <span>Más</span>
            </button>
          </li>
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
