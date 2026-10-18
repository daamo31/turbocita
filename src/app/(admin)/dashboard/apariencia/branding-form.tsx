"use client";

import { useState } from "react";
import { BookingShell } from "@/components/business-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  BRAND_COLORS, CARD_STYLES, LAYOUTS, THEMES, themeStyle,
  type CardStyleKey, type LayoutKey, type ThemeKey,
} from "@/lib/themes";
import { saveBranding } from "./actions";

type Initial = {
  name: string; theme: string; layout: string; card_style: string; brand_color: string | null; tagline: string | null;
  description: string | null; phone: string | null; address: string | null; logo_url: string | null;
};

const pick = <T extends string>(v: string, all: Record<string, unknown>, fallback: T) => (v in all ? (v as T) : fallback);

export function BrandingForm({ initial }: { initial: Initial }) {
  const [theme, setTheme] = useState<ThemeKey>(pick(initial.theme, THEMES, "classic"));
  const [layout, setLayout] = useState<LayoutKey>(pick(initial.layout, LAYOUTS, "classic"));
  const [cardStyle, setCardStyle] = useState<CardStyleKey | "auto">(pick(initial.card_style, { ...CARD_STYLES, auto: 1 }, "auto"));
  const [useBrand, setUseBrand] = useState(!!initial.brand_color);
  const [color, setColor] = useState(initial.brand_color ?? THEMES[theme].primary);
  const [tagline, setTagline] = useState(initial.tagline ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [address, setAddress] = useState(initial.address ?? "");

  const brand = useBrand ? color : null;

  return (
    <form action={saveBranding} className="grid gap-6 xl:grid-cols-[1fr_minmax(0,520px)]">
      <input type="hidden" name="theme" value={theme} />
      <input type="hidden" name="layout" value={layout} />
      <input type="hidden" name="card_style" value={cardStyle} />
      <input type="hidden" name="brand_color" value={brand ?? ""} />

      <div className="space-y-6">
        <div className="space-y-2">
          <Label>Plantilla de diseño</Label>
          <div className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(LAYOUTS) as LayoutKey[]).map((k) => (
              <button
                key={k} type="button" onClick={() => setLayout(k)}
                className={cn("rounded-lg border p-3 text-left text-xs transition hover:bg-muted", k === layout && "ring-2 ring-primary")}
              >
                <LayoutThumb kind={k} />
                <div className="mt-2 text-sm font-medium">{LAYOUTS[k].label}</div>
                <div className="text-muted-foreground">{LAYOUTS[k].hint}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Estilo y colores</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {(Object.keys(THEMES) as ThemeKey[]).map((k) => (
              <button
                key={k} type="button" onClick={() => { setTheme(k); if (!useBrand) setColor(THEMES[k].primary); }}
                className={cn("overflow-hidden rounded-lg border text-left text-xs transition hover:scale-[1.02]", k === theme && "ring-2 ring-primary")}
              >
                <div className="flex h-12" style={{ background: THEMES[k].bg, backgroundImage: THEMES[k].backdrop }}>
                  <span className="m-2 flex-1 rounded" style={{ background: THEMES[k].card, border: `1px solid ${THEMES[k].border}` }} />
                  <span className="m-2 w-4 rounded-full" style={{ background: THEMES[k].primary }} />
                </div>
                <div className="p-2">{THEMES[k].label}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Color de marca</Label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button" onClick={() => setUseBrand(false)} title="El de la plantilla"
              className={cn("h-8 rounded-full border px-3 text-xs", !useBrand && "ring-2 ring-primary")}
            >
              Plantilla
            </button>
            {BRAND_COLORS.map((c) => (
              <button
                key={c} type="button" aria-label={c} onClick={() => { setUseBrand(true); setColor(c); }}
                className={cn("size-8 rounded-full border", useBrand && color.toLowerCase() === c && "ring-2 ring-primary ring-offset-2")}
                style={{ background: c }}
              />
            ))}
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              Otro
              <input type="color" value={color} onChange={(e) => { setUseBrand(true); setColor(e.target.value); }} className="h-8 w-10 cursor-pointer" />
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Estilo de tarjetas</Label>
          <div className="flex flex-wrap gap-2">
            {(["auto", ...Object.keys(CARD_STYLES)] as (CardStyleKey | "auto")[]).map((k) => (
              <Button key={k} type="button" size="sm" variant={k === cardStyle ? "default" : "outline"} onClick={() => setCardStyle(k)}>
                {k === "auto" ? "Según plantilla" : CARD_STYLES[k]}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-1"><Label>Lema</Label>
          <Input name="tagline" maxLength={120} value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Tu peluquería de confianza" /></div>
        <div className="space-y-1"><Label>Descripción</Label>
          <Textarea name="description" maxLength={400} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1"><Label>Teléfono</Label><Input name="phone" maxLength={30} value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div className="space-y-1"><Label>Dirección</Label><Input name="address" maxLength={160} value={address} onChange={(e) => setAddress(e.target.value)} /></div>
        </div>
        <Button type="submit">Guardar cambios</Button>
      </div>

      <div className="space-y-2 xl:sticky xl:top-4 xl:self-start">
        <Label>Vista previa</Label>
        <div style={themeStyle(theme, brand, cardStyle)} className="bk-backdrop max-h-[640px] overflow-y-auto rounded-xl border">
          <div className={cn(layout !== "hero" && "p-5")}>
            <BookingShell
              compact
              layout={layout === "split" ? "classic" : layout}
              info={{ name: initial.name, tagline, description, phone, address, logo_url: initial.logo_url }}
            >
              <div className="space-y-3">
                <div className="bk-card p-4 text-sm">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">1</span>Servicio
                  </div>
                  <div className="bk-card !border-primary p-3 ring-2 ring-primary">
                    <div className="font-medium">Corte de pelo</div>
                    <div className="flex justify-between text-muted-foreground"><span>30 min</span><span className="font-semibold text-primary">15,00 €</span></div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm">09:00</Button>
                  <Button type="button" size="sm" variant="outline">09:15</Button>
                  <Button type="button" size="sm" variant="outline">09:30</Button>
                </div>
                <Button type="button" className="w-full">Confirmar reserva</Button>
              </div>
            </BookingShell>
          </div>
        </div>
        {layout === "split" && <p className="text-xs text-muted-foreground">La plantilla Dividida muestra la info a un lado en pantallas anchas; aquí se previsualiza en modo compacto.</p>}
      </div>
    </form>
  );
}

function LayoutThumb({ kind }: { kind: LayoutKey }) {
  const box = "rounded bg-muted-foreground/25";
  return (
    <div className="h-20 overflow-hidden rounded border bg-background p-1.5">
      {kind === "classic" && (
        <div className="flex h-full flex-col items-center gap-1">
          <div className="size-4 rounded bg-primary" /><div className={cn("h-1.5 w-12", box)} />
          <div className={cn("mt-1 h-full w-full", box)} />
        </div>
      )}
      {kind === "hero" && (
        <div className="flex h-full flex-col gap-1">
          <div className="-m-1.5 mb-0 h-6 bg-gradient-to-r from-primary to-primary/40" />
          <div className="flex items-center gap-1"><div className="size-4 rounded bg-primary" /><div className={cn("h-1.5 w-10", box)} /></div>
          <div className={cn("h-full w-full", box)} />
        </div>
      )}
      {kind === "split" && (
        <div className="flex h-full gap-1">
          <div className={cn("flex w-1/3 flex-col gap-1 p-1", box)}><div className="size-3 rounded bg-primary" /></div>
          <div className={cn("h-full flex-1", box)} />
        </div>
      )}
    </div>
  );
}
