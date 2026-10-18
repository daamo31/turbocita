import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BookingShell } from "@/components/business-header";
import { themeStyle, LAYOUTS, type LayoutKey } from "@/lib/themes";
import { BookingForm } from "./booking-form";

export default async function BookingPage({ params }: PageProps<"/reservar/[slug]">) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses").select("id, name, currency, theme, brand_color, layout, card_style, tagline, description, phone, address, logo_url").eq("slug", slug).maybeSingle();
  if (!business) notFound();

  const [{ data: services }, { data: professionals }] = await Promise.all([
    supabase.from("services").select("id, name, description, duration_min, price")
      .eq("business_id", business.id).eq("active", true).order("name"),
    supabase.from("professionals").select("id, name").eq("business_id", business.id).eq("active", true).order("name"),
  ]);
  const { data: links } = await supabase
    .from("professional_services").select("professional_id, service_id")
    .in("professional_id", (professionals ?? []).map((p) => p.id));

  const layout = (business.layout in LAYOUTS ? business.layout : "classic") as LayoutKey;

  return (
    <div style={themeStyle(business.theme, business.brand_color, business.card_style)} className="bk-backdrop min-h-screen">
      <BookingShell layout={layout} info={business}>
        <BookingForm
          businessId={business.id}
          businessName={business.name}
          currency={business.currency}
          services={services ?? []}
          professionals={professionals ?? []}
          links={links ?? []}
        />
      </BookingShell>
    </div>
  );
}
