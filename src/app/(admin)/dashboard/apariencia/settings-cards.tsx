"use client";

import { ActionForm, SubmitButton } from "@/components/action-form";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { removeLogo, saveFiscal, uploadLogo, type FormResult } from "./actions";

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
