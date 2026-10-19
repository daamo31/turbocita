"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { slugError, slugify } from "@/lib/slug";
import { checkSlug, signUp } from "./actions";

type Status = "idle" | "checking" | "free" | "taken" | "invalid";

export function SignupForm({ rootDomain }: { rootDomain: string | null }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [edited, setEdited] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [msg, setMsg] = useState("");

  const onName = (v: string) => {
    setName(v);
    if (!edited) setSlug(slugify(v));
  };

  useEffect(() => {
    if (!slug) { setStatus("idle"); return; }
    const err = slugError(slug);
    if (err) { setStatus("invalid"); setMsg(err); return; }
    setStatus("checking");
    let cancelled = false;
    const t = setTimeout(async () => {
      const free = await checkSlug(slug);
      if (cancelled) return;
      setStatus(free ? "free" : "taken");
      setMsg(free ? "Disponible ✓" : "Ya está en uso. Prueba otro.");
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [slug]);

  const preview = rootDomain ? `${slug || "mi-negocio"}.${rootDomain}` : `…/reservar/${slug || "mi-negocio"}`;
  const color = status === "free" ? "text-green-600" : status === "checking" ? "text-muted-foreground" : "text-destructive";

  return (
    <form action={signUp} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="bn">Nombre del negocio</Label>
        <Input id="bn" name="business_name" value={name} onChange={(e) => onName(e.target.value)} placeholder="Peluquería María" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="bs">Dirección de tu página de reservas</Label>
        <Input
          id="bs" name="business_slug" value={slug} required
          onChange={(e) => { setEdited(true); setSlug(slugify(e.target.value)); }}
          placeholder="peluqueria-maria"
        />
        <p className="text-xs text-muted-foreground">
          Tus clientes reservarán en: <b className="break-all">{preview}</b>
        </p>
        {status !== "idle" && <p className={`text-xs ${color}`}>{status === "checking" ? "Comprobando…" : msg}</p>}
      </div>
      <div className="space-y-2"><Label htmlFor="e2">Email</Label><Input id="e2" name="email" type="email" required /></div>
      <div className="space-y-2"><Label htmlFor="p2">Contraseña</Label><Input id="p2" name="password" type="password" minLength={8} required /></div>
      <label className="flex min-h-11 items-start gap-3 text-sm">
        <input type="checkbox" name="consent" required className="mt-0.5 size-5 shrink-0" />
        <span>Acepto la <a href="/privacidad" target="_blank" rel="noreferrer" className="font-medium underline">Política de Privacidad</a> de TurboCita.</span>
      </label>
      <Button type="submit" variant="secondary" className="w-full" disabled={status === "taken" || status === "invalid"}>
        Registrarme
      </Button>
    </form>
  );
}
