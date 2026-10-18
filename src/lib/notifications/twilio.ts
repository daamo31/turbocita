import "server-only";

// Twilio REST vía fetch (sin SDK, ligero para Vercel).
// WhatsApp: TWILIO_FROM="whatsapp:+14155238886"; para SMS, un número Twilio normal.
export async function sendBookingConfirmation(p: { to: string; name: string; startsAt: string }) {
  const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_FROM: from } = process.env;
  if (!sid || !token || !from) return; // notificaciones opcionales

  const when = new Date(p.startsAt).toLocaleString("es-ES", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/Madrid",
  });
  const phone = p.to.replace(/[ ()-]/g, "");
  const to = from.startsWith("whatsapp:") ? `whatsapp:${phone}` : phone;

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: `Hola ${p.name}, tu cita está reservada para el ${when}.` }),
  });
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${await res.text()}`);
}
