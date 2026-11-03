import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, mapStatus, planFromLookupKey } from "@/lib/stripe";

export const runtime = "nodejs";

const customerId = (c: string | Stripe.Customer | Stripe.DeletedCustomer) => (typeof c === "string" ? c : c.id);

// Sincroniza el plan del negocio con el estado de la suscripción. Es idempotente: siempre fija el estado actual.
async function syncSubscription(sub: Stripe.Subscription) {
  const admin = createAdminClient();
  const found = planFromLookupKey(sub.items.data[0]?.price.lookup_key);
  if (!found) {
    console.error("stripe webhook: precio sin lookup_key de TurboCita", sub.id);
    return;
  }
  const status = mapStatus(sub.status);
  const { data: biz } = await admin.from("businesses")
    .select("id, stripe_subscription_id, plan_status").eq("stripe_customer_id", customerId(sub.customer)).maybeSingle();
  if (!biz) {
    console.error("stripe webhook: cliente desconocido", customerId(sub.customer));
    return;
  }
  // Una suscripción antigua cancelada no debe pisar a la nueva que ya está activa
  if (status === "canceled" && biz.stripe_subscription_id && biz.stripe_subscription_id !== sub.id && biz.plan_status !== "canceled") return;

  await admin.from("businesses").update({
    plan: found.plan,
    billing_interval: found.interval,
    plan_status: status,
    stripe_subscription_id: sub.id,
    trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
  }).eq("id", biz.id);
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) return new NextResponse("Bad request", { status: 400 });

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), signature, secret);
  } catch {
    return new NextResponse("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.mode === "subscription" && s.subscription) {
          const id = typeof s.subscription === "string" ? s.subscription : s.subscription.id;
          await syncSubscription(await stripe.subscriptions.retrieve(id));
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_failed":
      case "invoice.paid": {
        // Re-lee la suscripción para reflejar past_due / active
        const inv = event.data.object as Stripe.Invoice;
        const subRef = inv.parent?.subscription_details?.subscription;
        if (subRef) await syncSubscription(await stripe.subscriptions.retrieve(typeof subRef === "string" ? subRef : subRef.id));
        break;
      }
    }
  } catch (e) {
    console.error("stripe webhook error", event.type, e);
    return new NextResponse("Error", { status: 500 }); // Stripe reintenta
  }
  return NextResponse.json({ received: true });
}
