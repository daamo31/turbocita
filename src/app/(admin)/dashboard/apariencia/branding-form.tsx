"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { THEMES, themeStyle, type ThemeKey } from "@/lib/themes";
import { saveBranding } from "./actions";

type Initial = {
  name: string; theme: string; brand_color: string | null; tagline: string | null;
  description: string | null; phone: string | null; address: string | null;
};

export function BrandingForm({ initial }: { initial: Initial }) {
  const [theme, setTheme] = useState<ThemeKey>((initial.theme in THEMES ? initial.theme : "classic") as ThemeKey);
  const [useBrand, setUseBrand] = useState(!!initial.brand_color);
  const [color, setColor] = useState(initial.brand_color ?? THEMES[theme].primary);
  const [tagline, setTagline] = useState(initial.tagline ?? "");
  const [description, setDescription] = useState(initial.description ?? "");

  const brand = useBrand ? color : null;

  return (
    <form action={saveBranding} className="grid gap-6 lg:grid-cols-2">
      <input type="hidden" name="theme" value={theme} />
      <input type="hidden" name="brand_color" value={brand ?? ""} />

      <div className="space-y-5">
        <div className="space-y-2">
          <Label>Plantilla</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(Object.keys(THEMES) as ThemeKey[]).map((k) => (
              <button
                key={k} type="button" onClick={() => { setTheme(k); if (!useBrand) setColor(THEMES[k].primary); }}
                className={cn("overflow-hidden rounded-lg border text-left text-xs", k === theme && "ring-2 ring-primary")}
              >
                <div className="flex h-10">
                  <span className="flex-1" style={{ background: THEMES[k].bg }} />
                  <span className="flex-1" style={{ background: THEMES[k].muted }} />
                  <span className="flex-1" style={{ background: THEMES[k].primary }} />
                </div>
                <div className="p-2">{THEMES[k].label}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Color de marca</Label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={useBrand} onChange={(e) => setUseBrand(e.target.checked)} />
            Usar mi propio color en botones y acentos
          </label>
          {useBrand && <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-20 cursor-pointer" />}
        </div>

        <div className="space-y-1"><Label>Lema</Label>
          <Input name="tagline" maxLength={120} value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Tu peluquería de confianza" /></div>
        <div className="space-y-1"><Label>Descripción</Label>
          <Textarea name="description" maxLength={400} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1"><Label>Teléfono</Label><Input name="phone" maxLength={30} defaultValue={initial.phone ?? ""} /></div>
          <div className="space-y-1"><Label>Dirección</Label><Input name="address" maxLength={160} defaultValue={initial.address ?? ""} /></div>
        </div>
        <Button type="submit">Guardar cambios</Button>
      </div>

      <div className="space-y-2">
        <Label>Vista previa</Label>
        <div style={themeStyle(theme, brand)} className="space-y-3 rounded-xl border p-5">
          <h2 className="text-xl font-bold">{initial.name}</h2>
          {tagline && <p className="text-sm font-medium">{tagline}</p>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
          <div className="rounded-lg border bg-card p-3 text-sm ring-2 ring-primary">
            <div className="font-medium">Corte de pelo</div>
            <div className="text-muted-foreground">30 min · 15,00 €</div>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm">09:00</Button>
            <Button type="button" size="sm" variant="outline">09:15</Button>
            <Button type="button" size="sm" variant="outline">09:30</Button>
          </div>
          <Button type="button" className="w-full">Confirmar reserva</Button>
        </div>
      </div>
    </form>
  );
}
