"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { THEME_KEYS, LAYOUT_KEYS, CARD_STYLES, PATTERNS } from "@/lib/themes";

const schema = z.object({
  theme: z.enum(THEME_KEYS),
  layout: z.enum(LAYOUT_KEYS),
  pattern: z.enum(["auto", "none", ...(Object.keys(PATTERNS) as [string, ...string[]])]),
  card_style: z.enum(["auto", ...(Object.keys(CARD_STYLES) as [string, ...string[]])]),
  brand_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().or(z.literal("")),
  tagline: z.string().trim().max(120),
  description: z.string().trim().max(400),
  phone: z.string().trim().max(30),
  address: z.string().trim().max(160),
});

export async function saveBranding(formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Revisa los datos: hay campos no válidos." };
  const { supabase, business, role } = await getContext();
  if (role !== "owner") return { ok: false, error: "Solo el dueño puede cambiar la apariencia." };
  const d = parsed.data;
  await supabase.from("businesses").update({
    theme: d.theme,
    layout: d.layout,
    pattern: d.pattern,
    card_style: d.card_style,
    brand_color: d.brand_color || null,
    tagline: d.tagline || null,
    description: d.description || null,
    phone: d.phone || null,
    address: d.address || null,
  }).eq("id", business.id);
  revalidatePath("/dashboard/apariencia");
  revalidatePath(`/reservar/${business.slug}`);
}

export type FormResult = { ok: boolean; message: string } | null;

const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

// Firma real del archivo (no basta con el Content-Type que envía el navegador)
function sniffMime(b: Uint8Array): string | null {
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45) return "image/webp";
  return null;
}

export async function uploadLogo(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const { supabase, business, role } = await getContext();
  if (role !== "owner") return { ok: false, message: "Solo el dueño puede cambiar el logo." };

  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Selecciona una imagen." };
  if (file.size > 1_000_000) return { ok: false, message: "El logo no puede superar 1 MB." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffMime(bytes);
  if (!mime) return { ok: false, message: "Formato no válido (PNG, JPG o WebP)." };

  const path = `${business.id}/logo-${Date.now()}.${EXT[mime]}`;
  const { error } = await supabase.storage.from("logos").upload(path, bytes, { contentType: mime });
  if (error) return { ok: false, message: "No se pudo subir el logo." };

  const { data: old } = await supabase.storage.from("logos").list(business.id);
  const stale = (old ?? []).map((o) => `${business.id}/${o.name}`).filter((p) => p !== path);
  if (stale.length) await supabase.storage.from("logos").remove(stale);

  const { data } = supabase.storage.from("logos").getPublicUrl(path);
  // logo_url y custom_domain no son editables vía API por el usuario: se escriben con service_role tras comprobar que es el dueño
  await createAdminClient().from("businesses").update({ logo_url: data.publicUrl }).eq("id", business.id);
  revalidatePath("/dashboard/apariencia");
  revalidatePath(`/reservar/${business.slug}`);
  return { ok: true, message: "Logo actualizado." };
}

export async function removeLogo() {
  const { supabase, business, role } = await getContext();
  if (role !== "owner") return { ok: false, error: "Solo el dueño puede quitar el logo." };
  const { data: old } = await supabase.storage.from("logos").list(business.id);
  if (old?.length) await supabase.storage.from("logos").remove(old.map((o) => `${business.id}/${o.name}`));
  await createAdminClient().from("businesses").update({ logo_url: null }).eq("id", business.id);
  revalidatePath("/dashboard/apariencia");
  revalidatePath(`/reservar/${business.slug}`);
}

export async function saveFiscal(formData: FormData) {
  const parsed = z.object({
    tax_id: z.string().trim().max(30),
    email: z.string().trim().email().max(120).or(z.literal("")),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "NIF o email no válidos." };
  const { supabase, business, role } = await getContext();
  if (role !== "owner") return { ok: false, error: "Solo el dueño puede cambiar los datos fiscales." };
  await supabase.from("business_private").upsert({
    business_id: business.id, tax_id: parsed.data.tax_id || null, email: parsed.data.email || null,
  });
  revalidatePath("/dashboard/apariencia");
}
