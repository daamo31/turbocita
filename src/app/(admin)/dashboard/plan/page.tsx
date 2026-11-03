import { getContext } from "@/lib/auth";
import { PLANS } from "@/lib/plans";
import { stripeConfigured } from "@/lib/stripe";
import { PlanPicker } from "./plan-picker";

const STATUS_NOTE: Record<string, string> = {
  trialing: "Periodo de prueba activo.",
  past_due: "Hay un pago pendiente: actualiza tu método de pago para no perder las funciones de tu plan.",
  canceled: "Suscripción cancelada: tu cuenta funciona con las limitaciones del plan Starter.",
};

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ error?: string; checkout?: string }> }) {
  const sp = await searchParams;
  const { supabase, business, plan, role } = await getContext();
  const { data: biz } = await supabase.from("businesses")
    .select("billing_interval, plan_status, stripe_subscription_id, trial_ends_at").eq("id", business.id).single();
  const status = biz?.plan_status ?? "active";
  const enabled = stripeConfigured();
  const contact = process.env.NEXT_PUBLIC_SALES_CONTACT;
  const error = typeof sp.error === "string" ? sp.error : null;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Tu plan</h1>
      {sp.checkout === "success" && (
        <p role="status" className="rounded-lg bg-green-100 p-3 text-sm text-green-900">
          ¡Gracias! Estamos activando tu plan; si no aparece en unos segundos, recarga la página.
        </p>
      )}
      {error && <p role="alert" className="rounded-lg bg-red-100 p-3 text-sm text-red-900">{error}</p>}
      <p className="text-sm text-muted-foreground">
        Plan actual: <b>{PLANS[plan].name}</b>
        {biz?.trial_ends_at && status === "trialing" && <> (prueba hasta el {new Date(biz.trial_ends_at).toLocaleDateString("es-ES")})</>}.
        {STATUS_NOTE[status] && <> {STATUS_NOTE[status]}</>}
      </p>
      <PlanPicker
        plan={plan}
        interval={biz?.billing_interval === "year" ? "year" : "month"}
        subscribed={Boolean(biz?.stripe_subscription_id) && status !== "canceled"}
        status={status}
        enabled={enabled}
        isOwner={role === "owner"}
      />
      {!enabled && (
        <p className="text-sm text-muted-foreground">
          Para cambiar de plan escríbenos
          {contact ? <>: <a className="text-primary underline" href={contact.includes("@") ? `mailto:${contact}` : contact}>{contact}</a></> : "."}
        </p>
      )}
    </div>
  );
}
