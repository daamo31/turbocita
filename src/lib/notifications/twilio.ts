import "server-only";

// Twilio REST vía fetch (sin SDK, ligero para Vercel).
// WhatsApp: TWILIO_FROM="whatsapp:+14155238886"; para SMS, un número Twilio normal.
// Solo se envía a prefijos permitidos (evita destinos de tarificación especial). Configurable con NOTIFY_ALLOWED_PREFIXES.
const allowedPrefixes = () => (process.env.NOTIFY_ALLOWED_PREFIXES ?? "+34").split(",").map((x) => x.trim()).filter(Boolean);

export async function sendBookingConfirmation(p: { to: string; businessName: string; startsAt: string; timeZone: string }) {
  const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_FROM: from } = process.env;
  if (!sid || !token || !from) return; // notificaciones opcionales

  const phone = p.to.replace(/[ ()-]/g, "");
  if (!/^\+[0-9]{8,15}$/.test(phone) || !allowedPrefixes().some((x) => phone.startsWith(x))) return;

  const when = new Date(p.startsAt).toLocaleString("es-ES", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: p.timeZone,
  });
  const to = from.startsWith("whatsapp:") ? `whatsapp:${phone}` : phone;

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: `Tu cita en ${p.businessName} está reservada para el ${when}.` }),
  });
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${await res.text()}`);
}
