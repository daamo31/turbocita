import { PRIVACY_VERSION } from "@/lib/privacy";

const EMAIL = process.env.NEXT_PUBLIC_PRIVACY_EMAIL;

export const metadata = { title: "Política de Privacidad · TurboCita" };

// Política de la plataforma: aplica a las cuentas de los negocios (dueños y empleados)
export default function PlatformPrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-5 text-sm leading-relaxed [&_h2]:mt-2 [&_h2]:text-base [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
      <h1 className="text-2xl font-bold">Política de Privacidad de TurboCita</h1>
      <p className="text-muted-foreground">Versión {PRIVACY_VERSION}</p>

      <section className="space-y-2">
        <h2>1. Quién es quién</h2>
        <ul>
          <li><b>TurboCita</b> es responsable de los datos de las cuentas de los negocios (email, nombre del negocio y datos de facturación del servicio).</li>
          <li>Sobre los datos de los <b>clientes finales</b> de cada negocio (nombre, teléfono, email, citas), el negocio es el responsable y TurboCita es su <b>encargada del tratamiento</b>.</li>
        </ul>
        {EMAIL && <p>Contacto de privacidad: <b>{EMAIL}</b></p>}
      </section>

      <section className="space-y-2">
        <h2>2. Finalidad y base legal</h2>
        <p>Crear y mantener tu cuenta y prestar el servicio de agenda, inventario y facturación (ejecución del contrato) y cumplir obligaciones legales. Los datos de los clientes finales se tratan solo para gestionar sus citas y enviarles notificaciones de confirmación y recordatorio.</p>
      </section>

      <section className="space-y-2">
        <h2>3. Conservación</h2>
        <p>Mientras mantengas tu cuenta o hasta que solicites su supresión. Las facturas se conservan durante los plazos legales. Los negocios pueden anonimizar a un cliente desde el panel cuando éste lo solicite.</p>
      </section>

      <section className="space-y-2">
        <h2>4. Proveedores y no cesión</h2>
        <p>Usamos Supabase (base de datos y autenticación), Vercel (alojamiento) y Twilio (envío de SMS/WhatsApp, que recibe únicamente el teléfono y el texto del aviso). <b>No vendemos ni compartimos datos</b> con empresas publicitarias ni con terceros ajenos al servicio.</p>
      </section>

      <section className="space-y-2">
        <h2>5. Seguridad</h2>
        <p>Conexiones HTTPS, cifrado en reposo, aislamiento estricto entre negocios mediante Row Level Security y claves de servicio solo en el servidor.</p>
      </section>

      <section className="space-y-2">
        <h2>6. Derechos</h2>
        <p>Acceso, rectificación, supresión, oposición, limitación y portabilidad, escribiendo al contacto de privacidad. Puedes reclamar ante la AEPD (aepd.es).</p>
      </section>
    </main>
  );
}
