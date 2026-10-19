import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BookingShell } from "@/components/business-header";
import { themeStyle, LAYOUTS, type LayoutKey } from "@/lib/themes";
import { Gift } from "lucide-react";
import { BookingForm } from "./booking-form";

export default async function BookingPage({ params }: PageProps<"/reservar/[slug]">) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses").select("id, name, currency, theme, brand_color, layout, card_style, pattern, tagline, description, phone, address, logo_url").eq("slug", slug).maybeSingle();
  if (!business) notFound();

  const { data: services } = await supabase.from("services").select("id, name, description, duration_min, price")
    .eq("business_id", business.id).eq("active", true).order("name");

  const { data: program } = await supabase
    .from("loyalty_programs").select("loyalty_tiers(stamps, discount_percent, description)")
    .eq("business_id", business.id).eq("is_active", true).maybeSingle();
  const tiers = [...((program?.loyalty_tiers as unknown as { stamps: number; discount_percent: number; description: string }[] | null) ?? [])]
    .sort((a, b) => a.stamps - b.stamps);

  const layout = (business.layout in LAYOUTS ? business.layout : "classic") as LayoutKey;

  return (
    <div style={themeStyle(business.theme, business.brand_color, business.card_style, business.pattern)} className="bk-backdrop relative isolate min-h-screen">
      <div aria-hidden className="bk-pattern fixed inset-0 -z-10" />
      <BookingShell layout={layout} info={business}>
        {tiers.length > 0 && (
          <section aria-label="Programa de fidelización" className="mb-4 rounded-xl border border-primary/40 bg-primary/5 p-4">
            <h2 className="flex items-center gap-2 font-semibold"><Gift className="size-5 text-primary" /> Programa de fidelización</h2>
            <p className="mt-1 text-sm text-muted-foreground">Suma un sello por cada visita completada y consigue premios:</p>
            <ul className="mt-2 space-y-1 text-sm">
              {tiers.map((t) => (
                <li key={t.stamps}><strong>{t.stamps} sellos</strong> → {t.description}</li>
              ))}
            </ul>
          </section>
        )}
        <BookingForm
          businessId={business.id}
          businessName={business.name}
          slug={slug}
          currency={business.currency}
          services={services ?? []}
          tiers={tiers}
        />
      </BookingShell>
    </div>
  );
}
