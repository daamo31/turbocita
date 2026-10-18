export const RESERVED_SLUGS = new Set([
  "www", "app", "admin", "api", "login", "registro", "dashboard", "reservar", "mail", "smtp",
  "ftp", "cdn", "static", "assets", "blog", "help", "ayuda", "soporte", "support", "status",
  "docs", "dev", "test", "staging", "demo", "turbocita", "billing", "factura", "pagos",
]);

export function slugify(input: string): string {
  return input
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
}

// Devuelve un mensaje de error, o null si el formato es válido
export function slugError(slug: string): string | null {
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) return "Usa 3-40 caracteres: minúsculas, números y guiones.";
  if (slug.startsWith("-") || slug.endsWith("-")) return "No puede empezar ni acabar en guion.";
  if (RESERVED_SLUGS.has(slug)) return "Ese nombre está reservado. Elige otro.";
  return null;
}
