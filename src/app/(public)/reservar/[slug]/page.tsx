import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BookingForm } from "./booking-form";

export default async function BookingPage({ params }: PageProps<"/reservar/[slug]">) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses").select("id, name, currency").eq("slug", slug).maybeSingle();
  if (!business) notFound();

  const [{ data: services }, { data: professionals }] = await Promise.all([
    supabase.from("services").select("id, name, description, duration_min, price")
      .eq("business_id", business.id).eq("active", true).order("name"),
    supabase.from("professionals").select("id, name").eq("business_id", business.id).eq("active", true).order("name"),
  ]);
  const { data: links } = await supabase
    .from("professional_services").select("professional_id, service_id")
    .in("professional_id", (professionals ?? []).map((p) => p.id));

  return (
    <main className="mx-auto max-w-2xl p-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">{business.name}</h1>
      <p className="mb-6 text-sm text-muted-foreground">Reserva tu cita online en menos de un minuto.</p>
      <BookingForm
        businessId={business.id}
        currency={business.currency}
        services={services ?? []}
        professionals={professionals ?? []}
        links={links ?? []}
      />
    </main>
  );
}
