import "server-only";
import Stripe from "stripe";
import { PLAN_ORDER, parsePlan, type PlanId } from "@/lib/plans";

export type Interval = "month" | "year";

let client: Stripe | null = null;

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY no configurada");
  return (client ??= new Stripe(process.env.STRIPE_SECRET_KEY));
}

// Los precios se identifican por lookup_key (los crea `npm run stripe:setup`), así no hay IDs de precio en el entorno
export const lookupKey = (plan: PlanId, interval: Interval) => `turbocita_${plan}_${interval}`;

export async function priceIdFor(plan: PlanId, interval: Interval): Promise<string | null> {
  const res = await getStripe().prices.list({ lookup_keys: [lookupKey(plan, interval)], active: true, limit: 1 });
  return res.data[0]?.id ?? null;
}

// Deduce plan e intervalo a partir de la lookup_key del precio de la suscripción
export function planFromLookupKey(key: string | null | undefined): { plan: PlanId; interval: Interval } | null {
  const m = /^turbocita_(starter|growth|pro)_(month|year)$/.exec(key ?? "");
  if (!m) return null;
  const plan = parsePlan(m[1]);
  return PLAN_ORDER.includes(plan) ? { plan, interval: m[2] as Interval } : null;
}

export function mapStatus(status: Stripe.Subscription.Status): "trialing" | "active" | "past_due" | "canceled" {
  switch (status) {
    case "trialing": return "trialing";
    case "active": return "active";
    case "past_due":
    case "unpaid":
    case "incomplete": return "past_due";
    default: return "canceled"; // canceled, incomplete_expired, paused
  }
}

export function siteUrl(h: Headers): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return `${h.get("x-forwarded-proto") ?? "https"}://${host}`;
}
