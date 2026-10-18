import type { CSSProperties } from "react";

type Preset = {
  label: string; bg: string; fg: string; card: string; muted: string; border: string; primary: string; radius: string;
};

export const THEMES = {
  classic: { label: "Clásico", bg: "#ffffff", fg: "#171717", card: "#ffffff", muted: "#f4f4f5", border: "#e4e4e7", primary: "#171717", radius: "0.5rem" },
  rosa: { label: "Rosa salón", bg: "#fff7f9", fg: "#3b1d29", card: "#ffffff", muted: "#fde8ee", border: "#f6cfda", primary: "#db2777", radius: "1rem" },
  barber: { label: "Barbería oscuro", bg: "#0f0f10", fg: "#f5f5f4", card: "#1a1a1c", muted: "#27272a", border: "#3f3f46", primary: "#d97706", radius: "0.25rem" },
  natural: { label: "Natural", bg: "#f6faf5", fg: "#1c2b1f", card: "#ffffff", muted: "#e6f0e3", border: "#cfe0ca", primary: "#2f7d4f", radius: "0.75rem" },
  oceano: { label: "Océano", bg: "#f4f9ff", fg: "#0f2236", card: "#ffffff", muted: "#e0eefc", border: "#c7defa", primary: "#2563eb", radius: "0.625rem" },
} satisfies Record<string, Preset>;

export type ThemeKey = keyof typeof THEMES;
export const THEME_KEYS = Object.keys(THEMES) as [ThemeKey, ...ThemeKey[]];

const isHex = (c: string | null | undefined): c is string => !!c && /^#[0-9a-fA-F]{6}$/.test(c);

// Texto blanco o negro según la luminosidad del color de marca
function readableOn(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "#111111" : "#ffffff";
}

// Variables CSS de shadcn: se aplican en un contenedor y heredan todos los componentes.
export function themeStyle(theme: string | null, brand: string | null): CSSProperties {
  const t: Preset = THEMES[(theme as ThemeKey) in THEMES ? (theme as ThemeKey) : "classic"];
  const primary = isHex(brand) ? brand : t.primary;
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
    backgroundColor: t.bg,
    color: t.fg,
  } as CSSProperties;
}
