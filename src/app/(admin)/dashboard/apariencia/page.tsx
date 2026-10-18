import { headers } from "next/headers";
import QRCode from "qrcode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getContext } from "@/lib/auth";
import { BrandingForm } from "./branding-form";
import { DomainCard, FiscalCard, LogoCard } from "./settings-cards";

export default async function AppearancePage() {
  const { supabase, business, role } = await getContext();
  const [{ data: b }, { data: priv }] = await Promise.all([
    supabase.from("businesses")
      .select("name, theme, brand_color, tagline, description, phone, address, logo_url, custom_domain")
      .eq("id", business.id).single(),
    supabase.from("business_private").select("tax_id, email").eq("business_id", business.id).maybeSingle(),
  ]);

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? `${proto}://${host}`;
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? null;
  const url = b?.custom_domain
    ? `https://${b.custom_domain}`
    : root ? `https://${business.slug}.${root}` : `${base}/reservar/${business.slug}`;
  const qr = await QRCode.toDataURL(url, { width: 600, margin: 2 });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Apariencia y enlace de reservas</h1>
      <Card>
        <CardHeader><CardTitle>Tu enlace y QR</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR de reservas" className="size-32" />
          <div className="space-y-2 text-sm">
            <a href={url} target="_blank" className="break-all underline">{url}</a>
            <div><a href={qr} download={`qr-${business.slug}.png`} className="text-primary underline">Descargar QR (PNG)</a></div>
          </div>
        </CardContent>
      </Card>
      {role === "owner" && b ? (
        <>
          <LogoCard logoUrl={b.logo_url} />
          <BrandingForm initial={b} />
          <DomainCard slug={business.slug} domain={b.custom_domain} root={root} />
          <FiscalCard taxId={priv?.tax_id ?? null} email={priv?.email ?? null} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Solo el dueño puede cambiar la apariencia.</p>
      )}
    </div>
  );
}
