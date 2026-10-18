import type { CSSProperties } from "react";

export const CARD_STYLES = {
  flat: "Plano",
  outline: "Borde",
  elevated: "Elevado",
  glass: "Cristal",
} as const;
export type CardStyleKey = keyof typeof CARD_STYLES;

export const LAYOUTS = {
  classic: { label: "Clásica", hint: "Cabecera centrada y reserva debajo" },
  hero: { label: "Portada", hint: "Banner con degradado y logo destacado" },
  split: { label: "Dividida", hint: "Info del negocio a un lado, reserva al otro" },
} as const;
export type LayoutKey = keyof typeof LAYOUTS;
export const LAYOUT_KEYS = Object.keys(LAYOUTS) as [LayoutKey, ...LayoutKey[]];

type Preset = {
  label: string; bg: string; fg: string; card: string; muted: string; border: string; primary: string; radius: string;
  // Fondo decorativo (degradados) y tipografía de títulos
  backdrop: string; serif?: boolean; card_style: CardStyleKey; dark?: boolean;
};

export const THEMES = {
  classic: {
    label: "Clásico", bg: "#ffffff", fg: "#171717", card: "#ffffff", muted: "#f4f4f5", border: "#e4e4e7", primary: "#171717", radius: "0.5rem",
    backdrop: "radial-gradient(900px 400px at 50% -10%, #e4e4e7 0%, transparent 70%)", card_style: "elevated",
  },
  rosa: {
    label: "Rosa salón", bg: "#fff7f9", fg: "#3b1d29", card: "#ffffff", muted: "#fde8ee", border: "#f6cfda", primary: "#db2777", radius: "1rem",
    backdrop: "radial-gradient(700px 400px at 90% -10%, #fbcfe8 0%, transparent 60%), radial-gradient(600px 400px at -10% 30%, #fde68a55 0%, transparent 60%)", card_style: "elevated",
  },
  barber: {
    label: "Barbería oscuro", bg: "#0f0f10", fg: "#f5f5f4", card: "#1a1a1c", muted: "#27272a", border: "#3f3f46", primary: "#d97706", radius: "0.25rem",
    backdrop: "radial-gradient(800px 420px at 50% -10%, #d9770633 0%, transparent 65%)", card_style: "outline", dark: true,
  },
  natural: {
    label: "Natural", bg: "#f6faf5", fg: "#1c2b1f", card: "#ffffff", muted: "#e6f0e3", border: "#cfe0ca", primary: "#2f7d4f", radius: "0.75rem",
    backdrop: "radial-gradient(800px 400px at 10% -10%, #bbf7d0 0%, transparent 60%)", card_style: "elevated",
  },
  oceano: {
    label: "Océano", bg: "#f4f9ff", fg: "#0f2236", card: "#ffffff", muted: "#e0eefc", border: "#c7defa", primary: "#2563eb", radius: "0.625rem",
    backdrop: "linear-gradient(180deg, #bfdbfe 0%, transparent 380px)", card_style: "elevated",
  },
  lavanda: {
    label: "Lavanda", bg: "#faf7ff", fg: "#2a1f3d", card: "#ffffff", muted: "#efe8fb", border: "#ddd0f5", primary: "#7c3aed", radius: "1.25rem",
    backdrop: "radial-gradient(700px 420px at 100% -10%, #ddd6fe 0%, transparent 60%), radial-gradient(500px 400px at 0% 20%, #fbcfe855 0%, transparent 60%)", card_style: "glass",
  },
  atardecer: {
    label: "Atardecer", bg: "#fff8f1", fg: "#3a2112", card: "#ffffff", muted: "#ffe9d6", border: "#fbd5b0", primary: "#ea580c", radius: "1rem",
    backdrop: "linear-gradient(160deg, #fed7aa 0%, #fecdd3 35%, transparent 70%)", card_style: "glass",
  },
  medianoche: {
    label: "Medianoche", bg: "#0b1020", fg: "#e8ecf8", card: "#141b33", muted: "#1c2545", border: "#2a3562", primary: "#6366f1", radius: "0.875rem",
    backdrop: "radial-gradient(800px 450px at 80% -10%, #6366f155 0%, transparent 60%), radial-gradient(600px 400px at 0% 10%, #22d3ee22 0%, transparent 60%)", card_style: "glass", dark: true,
  },
  elegante: {
    label: "Elegante", bg: "#faf7f2", fg: "#2b2118", card: "#fffdf9", muted: "#f1e9dc", border: "#e3d5bf", primary: "#9a6b2f", radius: "0.125rem",
    backdrop: "linear-gradient(180deg, #efe3cf 0%, transparent 320px)", serif: true, card_style: "outline",
  },
  neon: {
    label: "Neón", bg: "#09090b", fg: "#fafafa", card: "#131316", muted: "#1c1c21", border: "#2e2e36", primary: "#22d3ee", radius: "0.75rem",
    backdrop: "radial-gradient(700px 400px at 20% -10%, #22d3ee33 0%, transparent 60%), radial-gradient(700px 400px at 90% 0%, #e879f933 0%, transparent 60%)", card_style: "glass", dark: true,
  },
  menta: {
    label: "Menta", bg: "#f2fbf9", fg: "#0f2b27", card: "#ffffff", muted: "#d9f3ee", border: "#b7e6dd", primary: "#0d9488", radius: "1.5rem",
    backdrop: "radial-gradient(800px 400px at 50% -15%, #99f6e4 0%, transparent 65%)", card_style: "elevated",
  },
  cereza: {
    label: "Cereza", bg: "#fff5f5", fg: "#3b1114", card: "#ffffff", muted: "#fde3e3", border: "#f8c4c4", primary: "#dc2626", radius: "0.5rem",
    backdrop: "linear-gradient(180deg, #fecaca 0%, transparent 340px)", card_style: "elevated",
  },
} satisfies Record<string, Preset>;

export type ThemeKey = keyof typeof THEMES;
export const THEME_KEYS = Object.keys(THEMES) as [ThemeKey, ...ThemeKey[]];

// Paleta rápida para el color de marca
export const BRAND_COLORS = [
  "#171717", "#dc2626", "#ea580c", "#d97706", "#ca8a04", "#65a30d", "#16a34a", "#0d9488",
  "#0891b2", "#2563eb", "#4f46e5", "#7c3aed", "#c026d3", "#db2777", "#e11d48", "#9a6b2f",
];

const isHex = (c: string | null | undefined): c is string => !!c && /^#[0-9a-fA-F]{6}$/.test(c);

// Texto blanco o negro según la luminosidad del color de marca
export function readableOn(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "#111111" : "#ffffff";
}

export const resolveTheme = (k: string | null | undefined): Preset => THEMES[(k as ThemeKey) in THEMES ? (k as ThemeKey) : "classic"];

export function resolveCardStyle(cardStyle: string | null | undefined, theme: string | null | undefined): CardStyleKey {
  return cardStyle && cardStyle in CARD_STYLES ? (cardStyle as CardStyleKey) : resolveTheme(theme).card_style;
}

// Variables CSS de shadcn + decoración propia (.bk-card, .bk-backdrop, .bk-title en globals.css)
export function themeStyle(theme: string | null, brand: string | null, cardStyle?: string | null): CSSProperties {
  const t = resolveTheme(theme);
  const primary = isHex(brand) ? brand : t.primary;
  const cs = resolveCardStyle(cardStyle, theme);
  const shadow = t.dark ? "0 10px 30px -12px rgb(0 0 0 / 0.7)" : "0 10px 30px -14px rgb(0 0 0 / 0.25), 0 2px 6px -2px rgb(0 0 0 / 0.08)";
  return {
    "--background": t.bg,
    "--foreground": t.fg,
    "--card": t.card,
    "--card-foreground": t.fg,
    "--popover": t.card,
    "--popover-foreground": t.fg,
    "--muted": t.muted,
    "--muted-foreground": `color-mix(in oklab, ${t.fg} 60%, ${t.bg})`,
    "--secondary": t.muted,
    "--secondary-foreground": t.fg,
    "--accent": t.muted,
    "--accent-foreground": t.fg,
    "--border": t.border,
    "--input": t.border,
    "--primary": primary,
    "--primary-foreground": readableOn(primary),
    "--ring": primary,
    "--radius": t.radius,
    "--bk-backdrop": t.backdrop,
    "--bk-title-font": t.serif ? "Georgia, 'Times New Roman', serif" : "inherit",
    "--bk-card-bg": cs === "glass" ? `color-mix(in oklab, ${t.card} 70%, transparent)` : cs === "flat" ? t.muted : t.card,
    "--bk-card-shadow": cs === "elevated" || cs === "glass" ? shadow : "none",
    "--bk-card-border": cs === "flat" ? "transparent" : cs === "glass" ? `color-mix(in oklab, ${t.fg} 14%, transparent)` : t.border,
    "--bk-card-blur": cs === "glass" ? "blur(14px)" : "none",
    backgroundColor: t.bg,
    color: t.fg,
  } as CSSProperties;
}
