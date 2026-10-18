import Link from "next/link";
import { Button } from "@/components/ui/button";

const FEATURES = [
  ["📅", "Reservas online 24/7", "Tus clientes reservan desde un enlace o un QR, sin crear cuenta ni descargar nada."],
  ["🎨", "Tu imagen, tus colores", "Plantillas, color de marca y logo para que la página sea la de tu negocio."],
  ["📦", "Inventario al día", "Controla productos, stock y avisos de stock bajo."],
  ["🧾", "Presupuestos y facturas", "Genera PDFs y envíalos por WhatsApp o email en un clic."],
];

const STEPS = [
  ["1", "Crea tu negocio", "Elige el nombre y la dirección de tu página de reservas."],
  ["2", "Configura servicios y equipo", "Añade lo que ofreces, tus profesionales y sus horarios."],
  ["3", "Comparte el enlace o el QR", "Ponlo en el escaparate, en Instagram o en tu WhatsApp."],
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between p-4">
        <span className="text-xl font-bold tracking-tight">TurboCita</span>
        <nav className="flex items-center gap-2">
          <Link href="/login"><Button variant="ghost">Iniciar sesión</Button></Link>
          <Link href="/registro"><Button>Crear mi negocio</Button></Link>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl space-y-20 px-4 pb-20">
        <section className="space-y-6 pt-12 text-center">
          <h1 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            Menos llamadas, más citas para tu negocio local
          </h1>
          <p className="mx-auto max-w-xl text-lg text-muted-foreground">
            Agenda online, inventario y facturación en una sola herramienta, pensada para peluquerías y tiendas de barrio.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/registro"><Button size="lg">Empezar ahora</Button></Link>
            <Link href="/login"><Button size="lg" variant="outline">Ya tengo cuenta</Button></Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map(([icon, title, text]) => (
            <div key={title} className="rounded-xl border p-5">
              <div className="text-2xl">{icon}</div>
              <h2 className="mt-2 font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </section>

        <section className="space-y-6">
          <h2 className="text-center text-2xl font-bold">Listo en tres pasos</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {STEPS.map(([n, title, text]) => (
              <div key={n} className="rounded-xl bg-muted p-5">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{n}</div>
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border p-8 text-center">
          <h2 className="text-2xl font-bold">Empieza a recibir reservas hoy</h2>
          <Link href="/registro" className="mt-4 inline-block"><Button size="lg">Crear mi negocio</Button></Link>
        </section>
      </main>
    </div>
  );
}
