import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { themeStyle } from "@/lib/themes";
import { BookingForm } from "./booking-form";

export default async function BookingPage({ params }: PageProps<"/reservar/[slug]">) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses").select("id, name, currency, theme, brand_color, tagline, description, phone, address, logo_url").eq("slug", slug).maybeSingle();
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
    <div style={themeStyle(business.theme, business.brand_color)} className="min-h-screen">
      <main className="mx-auto max-w-2xl p-4 py-8">
        {business.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={business.logo_url} alt={`Logo de ${business.name}`} className="mb-3 h-16 w-auto" />
        )}
        <h1 className="text-3xl font-bold">{business.name}</h1>
        {business.tagline && <p className="mt-1 font-medium">{business.tagline}</p>}
        {business.description && <p className="mt-2 text-sm text-muted-foreground">{business.description}</p>}
        {(business.address || business.phone) && (
          <p className="mt-2 text-sm text-muted-foreground">
            {[business.address, business.phone].filter(Boolean).join(" · ")}
          </p>
        )}
        <div className="mt-6">
          <BookingForm
            businessId={business.id}
            currency={business.currency}
            services={services ?? []}
            professionals={professionals ?? []}
            links={links ?? []}
          />
        </div>
      </main>
    </div>
  );
}
