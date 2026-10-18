import Link from "next/link";
import { Button } from "@/components/ui/button";

const FEATURES = [
  ["Reservas online 24/7", "Tus clientes reservan desde un enlace o un QR, sin crear cuenta."],
  ["Tu imagen, tus colores", "Elige plantilla y color de marca para tu página de reservas."],
  ["Inventario y facturación", "Stock, presupuestos y facturas en PDF listos para enviar."],
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 p-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight">TurboCita</h1>
      <p className="text-lg text-muted-foreground">
        La herramienta de citas, inventario y facturación para negocios locales.
      </p>
      <div className="flex gap-3">
        <Link href="/login"><Button size="lg">Iniciar sesión</Button></Link>
        <Link href="/login#registro"><Button size="lg" variant="outline">Crear mi negocio</Button></Link>
      </div>
      <div className="grid gap-4 text-left sm:grid-cols-3">
        {FEATURES.map(([t, d]) => (
          <div key={t} className="rounded-lg border p-4"><div className="font-semibold">{t}</div><p className="mt-1 text-sm text-muted-foreground">{d}</p></div>
        ))}
      </div>
    </main>
  );
}
