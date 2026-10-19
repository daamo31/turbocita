"use client";

import { ActionForm, SubmitButton } from "@/components/action-form";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { removeLogo, saveDomain, saveFiscal, uploadLogo, type FormResult } from "./actions";

function Msg({ r }: { r: FormResult }) {
  useEffect(() => {
    if (r) (r.ok ? toast.success : toast.error)(r.message);
  }, [r]);
  if (!r) return null;
  return <p className={r.ok ? "text-sm text-green-600" : "text-sm text-destructive"}>{r.message}</p>;
}

export function LogoCard({ logoUrl }: { logoUrl: string | null }) {
  const [res, action, pending] = useActionState(uploadLogo, null);
  return (
    <Card>
      <CardHeader><CardTitle>Logo</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logo actual" className="h-20 w-auto rounded border bg-white p-1" />
        )}
        <form action={action} className="flex flex-wrap items-center gap-2">
          <Input name="logo" type="file" accept="image/png,image/jpeg,image/webp" required className="w-full sm:max-w-xs" />
          <SubmitButton disabled={pending}>{pending ? "Subiendo…" : "Subir"}</SubmitButton>
        </form>
        {logoUrl && (
          <ActionForm action={removeLogo} success="Logo eliminado"><SubmitButton variant="outline" size="sm">Quitar logo</SubmitButton></ActionForm>
        )}
        <p className="text-xs text-muted-foreground">PNG, JPG o WebP, máximo 1 MB.</p>
        <Msg r={res} />
      </CardContent>
    </Card>
  );
}

export function DomainCard({ slug, domain, root }: { slug: string; domain: string | null; root: string | null }) {
  const [res, action, pending] = useActionState(saveDomain, null);
  return (
    <Card>
      <CardHeader><CardTitle>Dominio propio</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        {root && <p>Dirección incluida: <b>{slug}.{root}</b></p>}
        <form action={action} className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="domain">Tu dominio</Label>
            <Input id="domain" name="domain" placeholder="reservas.mipeluqueria.com" defaultValue={domain ?? ""} className="w-72" />
          </div>
          <SubmitButton disabled={pending}>Guardar</SubmitButton>
        </form>
        {domain && (
          <div className="rounded-md bg-muted p-3 text-xs">
            Configura en tu proveedor de DNS: <b>CNAME</b> de <code>{domain}</code> → <code>cname.vercel-dns.com</code>
            {" "}(si es un dominio raíz, un registro <b>A</b> → <code>76.76.21.21</code>). Puede tardar unos minutos.
          </div>
        )}
        <Msg r={res} />
      </CardContent>
    </Card>
  );
}

export function FiscalCard({ taxId, email }: { taxId: string | null; email: string | null }) {
  return (
    <Card>
      <CardHeader><CardTitle>Datos fiscales (privados)</CardTitle></CardHeader>
      <CardContent>
        <p className="mb-3 text-xs text-muted-foreground">Solo aparecen en tus facturas; no se muestran en la página de reservas.</p>
        <ActionForm action={saveFiscal} success="Datos fiscales guardados ✓" className="grid gap-3 sm:grid-cols-3 sm:items-end">
          <div className="space-y-1"><Label>NIF / CIF</Label><Input name="tax_id" defaultValue={taxId ?? ""} maxLength={30} /></div>
          <div className="space-y-1"><Label>Email de facturación</Label><Input name="email" type="email" defaultValue={email ?? ""} /></div>
          <SubmitButton>Guardar</SubmitButton>
        </ActionForm>
      </CardContent>
    </Card>
  );
}
