"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, priceIdFor, siteUrl, stripeConfigured } from "@/lib/stripe";

const schema = z.object({
  plan: z.enum(["starter", "growth", "pro"]),
  interval: z.enum(["month", "year"]),
});

const back = (msg: string) => redirect(`/dashboard/plan?error=${encodeURIComponent(msg)}`);

// Devuelve el cliente de Stripe del negocio; lo crea la primera vez
async function ensureCustomer(businessId: string, name: string, email: string | undefined) {
  const admin = createAdminClient();
  const { data: biz } = await admin.from("businesses").select("stripe_customer_id").eq("id", businessId).single();
  if (biz?.stripe_customer_id) return biz.stripe_customer_id as string;
  const customer = await getStripe().customers.create({ name, email, metadata: { business_id: businessId } });
  await admin.from("businesses").update({ stripe_customer_id: customer.id }).eq("id", businessId);
  return customer.id;
}

export async function startCheckout(formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) back("Plan no válido.");
  const { plan, interval } = parsed.data!;
  if (!stripeConfigured()) back("Los pagos aún no están configurados.");

  const { business, user, role } = await getContext();
  if (role !== "owner") back("Solo el dueño puede cambiar de plan.");

  const admin = createAdminClient();
  const { data: biz } = await admin.from("businesses")
    .select("stripe_subscription_id, plan_status").eq("id", business.id).single();
  // Con una suscripción viva el cambio se hace en el portal (evita cobrar dos veces)
  if (biz?.stripe_subscription_id && biz.plan_status !== "canceled") await openPortal();

  const price = await priceIdFor(plan, interval);
  if (!price) back("Ese plan no está disponible todavía.");

  const customer = await ensureCustomer(business.id, business.name, user.email);
  const base = siteUrl(await headers());
  const trial = Number(process.env.STRIPE_TRIAL_DAYS);

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: business.id,
    line_items: [{ price: price!, quantity: 1 }],
    allow_promotion_codes: true,
    billing_address_collection: "required",
    tax_id_collection: { enabled: true },
    customer_update: { name: "auto", address: "auto" },
    ...(trial > 0 ? { subscription_data: { trial_period_days: Math.min(trial, 90) } } : {}),
    success_url: `${base}/dashboard/plan?checkout=success`,
    cancel_url: `${base}/dashboard/plan`,
  });
  redirect(session.url!);
}

export async function openPortal() {
  if (!stripeConfigured()) back("Los pagos aún no están configurados.");
  const { business, role } = await getContext();
  if (role !== "owner") back("Solo el dueño puede gestionar la suscripción.");
  const { data: biz } = await createAdminClient().from("businesses").select("stripe_customer_id").eq("id", business.id).single();
  if (!biz?.stripe_customer_id) back("Todavía no tienes una suscripción.");

  const session = await getStripe().billingPortal.sessions.create({
    customer: biz!.stripe_customer_id,
    return_url: `${siteUrl(await headers())}/dashboard/plan`,
  });
  redirect(session.url);
}
