import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRIVACY_VERSION } from "@/lib/privacy";

export const metadata = { title: "Política de Privacidad" };

// Política de privacidad pública de cada negocio (el negocio es el responsable del tratamiento)
export default async function BusinessPrivacyPage({ params }: PageProps<"/privacidad/[slug]">) {
  const { slug } = await params;
  const db = createAdminClient();
  const { data: b } = await db.from("businesses").select("id, name, phone, address").eq("slug", slug).maybeSingle();
  if (!b) notFound();
  // Identidad y contacto del responsable: obligatorios en la información al interesado
  const { data: priv } = await db.from("business_private").select("tax_id, email").eq("business_id", b.id).maybeSingle();
  const contact = [priv?.email, b.phone].filter(Boolean).join(" · ") || "el propio establecimiento";

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-5 text-sm leading-relaxed [&_h2]:mt-2 [&_h2]:text-base [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
      <h1 className="text-2xl font-bold">Política de Privacidad</h1>
      <p className="text-muted-foreground">{b.name} · versión {PRIVACY_VERSION}</p>

      <section className="space-y-2">
        <h2>1. Responsable del tratamiento</h2>
        <ul>
          <li><b>Responsable:</b> {b.name}{priv?.tax_id ? ` (NIF/CIF ${priv.tax_id})` : ""}</li>
          {b.address && <li><b>Dirección:</b> {b.address}</li>}
          <li><b>Contacto para ejercer tus derechos:</b> {contact}</li>
        </ul>
        <p>La reserva se gestiona con la plataforma TurboCita, que actúa como encargada del tratamiento por cuenta del responsable.</p>
      </section>

      <section className="space-y-2">
        <h2>2. Datos que recogemos y finalidad</h2>
        <p>Nombre, teléfono, email (opcional) y notas (opcionales) que facilitas al reservar, junto con los datos de la cita. Se utilizan <b>exclusivamente para la gestión de citas y el envío de notificaciones de confirmación y recordatorio</b>, y, si el negocio tiene programa de fidelización, para contar tus visitas y sellos.</p>
      </section>

      <section className="space-y-2">
        <h2>3. Base legal</h2>
        <ul>
          <li><b>Ejecución del servicio solicitado</b> (reservar y atender tu cita).</li>
          <li><b>Tu consentimiento</b>, que das marcando la casilla al reservar y que puedes retirar en cualquier momento.</li>
          <li><b>Obligación legal</b> cuando se emite una factura (conservación fiscal y contable).</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2>4. Plazo de conservación</h2>
        <p>Mientras se mantenga la relación comercial o hasta que solicites su supresión. Las facturas emitidas se conservan durante los plazos que exige la normativa fiscal y mercantil. Si solicitas la supresión, tus datos identificativos se eliminan o se anonimizan; las estadísticas del negocio (fecha e importe de las citas) se conservan sin que puedan identificarte.</p>
      </section>

      <section className="space-y-2">
        <h2>5. Destinatarios y proveedores</h2>
        <p><b>No vendemos ni cedemos tus datos</b> a empresas publicitarias ni a terceros ajenos a la prestación del servicio. Solo intervienen proveedores necesarios, con contrato de encargado de tratamiento:</p>
        <ul>
          <li><b>Supabase</b>: almacenamiento de la base de datos (cifrado en tránsito y en reposo).</li>
          <li><b>Vercel</b>: alojamiento de la aplicación.</li>
          <li><b>Twilio</b>: tu teléfono se comparte únicamente para enviar notificaciones del servicio (SMS/WhatsApp) sobre tu cita.</li>
        </ul>
        <p>Si algún proveedor trata datos fuera del Espacio Económico Europeo, lo hace con las garantías del RGPD (por ejemplo, cláusulas contractuales tipo).</p>
      </section>

      <section className="space-y-2">
        <h2>6. Tus derechos</h2>
        <p>Puedes ejercer los derechos de <b>acceso, rectificación, supresión, oposición, limitación y portabilidad</b>, y retirar tu consentimiento, escribiendo a {contact}. También puedes presentar una reclamación ante la Agencia Española de Protección de Datos (aepd.es) o la autoridad de control de tu país.</p>
      </section>
    </main>
  );
}
