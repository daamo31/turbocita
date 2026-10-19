import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BookingShell } from "@/components/business-header";
import { themeStyle, LAYOUTS, type LayoutKey } from "@/lib/themes";
import { BookingForm } from "./booking-form";

export default async function BookingPage({ params }: PageProps<"/reservar/[slug]">) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses").select("id, name, currency, theme, brand_color, layout, card_style, pattern, tagline, description, phone, address, logo_url").eq("slug", slug).maybeSingle();
  if (!business) notFound();

  const { data: services } = await supabase.from("services").select("id, name, description, duration_min, price")
    .eq("business_id", business.id).eq("active", true).order("name");

  const layout = (business.layout in LAYOUTS ? business.layout : "classic") as LayoutKey;

  return (
    <div style={themeStyle(business.theme, business.brand_color, business.card_style, business.pattern)} className="bk-backdrop relative isolate min-h-screen">
      <div aria-hidden className="bk-pattern fixed inset-0 -z-10" />
      <BookingShell layout={layout} info={business}>
        <BookingForm
          businessId={business.id}
          businessName={business.name}
          currency={business.currency}
          services={services ?? []}
        />
      </BookingShell>
    </div>
  );
}
