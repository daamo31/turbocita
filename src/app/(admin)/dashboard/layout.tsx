import Link from "next/link";
import { getContext } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/(auth)/login/actions";

const NAV = [
  ["/dashboard/agenda", "Agenda"],
  ["/dashboard/servicios", "Servicios"],
  ["/dashboard/equipo", "Equipo"],
  ["/dashboard/inventario", "Inventario"],
  ["/dashboard/facturacion", "Facturación"],
] as const;

export default async function AdminLayout({ children }: LayoutProps<"/dashboard">) {
  const { business } = await getContext();
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 p-3">
          <span className="font-bold">{business.name}</span>
          <nav className="flex flex-1 flex-wrap gap-1">
            {NAV.map(([href, label]) => (
              <Link key={href} href={href}><Button variant="ghost" size="sm">{label}</Button></Link>
            ))}
          </nav>
          <Link href={`/reservar/${business.slug}`} target="_blank" className="text-xs text-muted-foreground underline">
            /reservar/{business.slug}
          </Link>
          <form action={signOut}><Button variant="outline" size="sm">Salir</Button></form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4">{children}</main>
    </div>
  );
}
