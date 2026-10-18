import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight">TurboCita</h1>
      <p className="text-muted-foreground">
        Citas online, inventario y facturación para peluquerías y negocios locales.
      </p>
      <Link href="/login"><Button size="lg">Acceder al panel</Button></Link>
    </main>
  );
}
