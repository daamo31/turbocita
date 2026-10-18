import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { getContext } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { AdminNav } from "@/components/admin-nav";
import { signOut } from "@/app/(auth)/login/actions";

export default async function AdminLayout({ children }: LayoutProps<"/dashboard">) {
  const { business } = await getContext();
  return (
    <div className="min-h-screen overflow-x-clip">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2">
          <span className="mr-auto min-w-0 truncate font-bold">{business.name}</span>
          <Link
            href={`/reservar/${business.slug}`}
            target="_blank"
            aria-label="Ver mi página de reservas"
            className="inline-flex h-11 items-center gap-1.5 rounded-lg px-3 text-sm text-muted-foreground hover:bg-muted md:h-9"
          >
            <ExternalLink className="size-4" />
            <span className="hidden sm:inline">/reservar/{business.slug}</span>
            <span className="sm:hidden">Mi web</span>
          </Link>
          <form action={signOut}>
            <Button variant="outline" size="sm" aria-label="Cerrar sesión">
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </form>
        </div>
      </header>

      {/* pb-24: deja sitio a la barra inferior fija en móvil */}
      <div className="mx-auto flex max-w-6xl gap-8 px-4 py-4 pb-24 md:py-6 md:pb-8">
        <AdminNav />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
