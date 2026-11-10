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

export const PATTERNS = {
  stars: "Estrellas",
  stripes: "Rayas",
  dots: "Puntos",
  waves: "Olas",
  leaves: "Hojas",
  bubbles: "Burbujas",
  diamonds: "Rombos",
  grid: "Cuadrícula",
  confetti: "Confeti",
  scissors: "Tijeras",
  combs: "Peines",
  razors: "Navajas",
  salon: "Peluquería",
  geo: "Geométrico",
  mesh: "Malla",
  aurora: "Aurora",
  hexagons: "Hexágonos",
  circuit: "Circuito",
  marble: "Mármol",
  gradient_waves: "Olas degradadas",
  bokeh: "Bokeh",
  noise: "Ruido",
  organic: "Orgánico",
} as const;
export type PatternKey = keyof typeof PATTERNS;

const scissors = (x: number, y: number, r: number, c: string) =>
  `<g transform='translate(${x} ${y}) rotate(${r})' fill='none' stroke='${c}' stroke-width='1.8' stroke-linecap='round'><circle cx='-6' cy='13' r='5'/><circle cx='6' cy='13' r='5'/><path d='M-4.5 8.5 L5 -14 M4.5 8.5 L-5 -14'/></g>`;
const comb = (x: number, y: number, r: number, c: string) =>
  `<g transform='translate(${x} ${y}) rotate(${r})' fill='none' stroke='${c}' stroke-width='1.6' stroke-linecap='round'><rect x='-20' y='-6' width='40' height='8' rx='2'/><path d='M-17 2v9M-12 2v9M-7 2v9M-2 2v9M3 2v9M8 2v9M13 2v9M17 2v9'/></g>`;
const razor = (x: number, y: number, r: number, c: string) =>
  `<g transform='translate(${x} ${y}) rotate(${r})' fill='none' stroke='${c}' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><rect x='-24' y='-4' width='22' height='8' rx='4'/><path d='M-2 -3 H20 Q24 -3 24 1 L-2 4Z'/><circle cx='-13' cy='0' r='1' fill='${c}'/></g>`;

// Cada patrón es una baldosa SVG repetible; size = lado de la baldosa en px
const TILES: Record<PatternKey, { size: number; svg: (c: string) => string }> = {
  stars: {
    size: 120,
    svg: (c) => `<g fill='${c}'><path d='M20 12 L22.5 21.5 L32 24 L22.5 26.5 L20 36 L17.5 26.5 L8 24 L17.5 21.5Z'/><path d='M88 70 L90 77 L97 79 L90 81 L88 88 L86 81 L79 79 L86 77Z'/><circle cx='70' cy='20' r='1.6'/><circle cx='30' cy='92' r='1.6'/><circle cx='108' cy='44' r='1.2'/><circle cx='50' cy='60' r='1'/></g>`,
  },
  stripes: {
    size: 40,
    svg: (c) => `<path d='M-10 10 L10 -10 M0 40 L40 0 M30 50 L50 30' stroke='${c}' stroke-width='6' fill='none'/>`,
  },
  dots: { size: 28, svg: (c) => `<circle cx='14' cy='14' r='2' fill='${c}'/>` },
  waves: {
    size: 80,
    svg: (c) => `<path d='M0 20 Q20 6 40 20 T80 20 M0 60 Q20 46 40 60 T80 60' stroke='${c}' stroke-width='2' fill='none'/>`,
  },
  leaves: {
    size: 110,
    svg: (c) => `<g fill='${c}'><ellipse cx='25' cy='25' rx='5' ry='14' transform='rotate(35 25 25)'/><ellipse cx='80' cy='70' rx='4' ry='11' transform='rotate(-30 80 70)'/><ellipse cx='85' cy='18' rx='3' ry='8' transform='rotate(70 85 18)'/><ellipse cx='28' cy='88' rx='3' ry='8' transform='rotate(-60 28 88)'/></g>`,
  },
  bubbles: {
    size: 140,
    svg: (c) => `<g fill='none' stroke='${c}' stroke-width='2'><circle cx='30' cy='30' r='14'/><circle cx='100' cy='50' r='8'/><circle cx='60' cy='105' r='20'/><circle cx='122' cy='118' r='5'/></g>`,
  },
  diamonds: {
    size: 56,
    svg: (c) => `<path d='M28 6 L50 28 L28 50 L6 28Z' stroke='${c}' stroke-width='1.5' fill='none'/><circle cx='28' cy='28' r='2' fill='${c}'/>`,
  },
  grid: { size: 44, svg: (c) => `<path d='M44 0 V44 H0' stroke='${c}' stroke-width='1' fill='none'/>` },
  scissors: {
    size: 130,
    svg: (c) => scissors(32, 36, 25, c) + scissors(98, 96, -35, c) + `<circle cx='100' cy='24' r='1.8' fill='${c}'/><circle cx='28' cy='104' r='1.8' fill='${c}'/>`,
  },
  combs: {
    size: 150,
    svg: (c) => comb(40, 34, -20, c) + comb(112, 108, 25, c) + `<circle cx='118' cy='30' r='2' fill='${c}'/><circle cx='34' cy='116' r='2' fill='${c}'/>`,
  },
  razors: {
    size: 150,
    svg: (c) => razor(52, 36, -15, c) + razor(104, 112, 30, c) + `<circle cx='120' cy='34' r='2' fill='${c}'/><circle cx='28' cy='112' r='2' fill='${c}'/>`,
  },
  salon: {
    size: 190,
    svg: (c) => scissors(36, 40, 20, c) + comb(130, 34, 15, c) + razor(52, 146, -20, c) + scissors(148, 138, -30, c) + `<circle cx='95' cy='90' r='2' fill='${c}'/><circle cx='170' cy='86' r='1.6' fill='${c}'/><circle cx='20' cy='96' r='1.6' fill='${c}'/>`,
  },
  confetti: {
    size: 130,
    svg: (c) => `<g fill='${c}'><rect x='20' y='20' width='10' height='4' rx='1' transform='rotate(30 25 22)'/><rect x='90' y='30' width='4' height='10' rx='1' transform='rotate(-25 92 35)'/><rect x='60' y='85' width='10' height='4' rx='1' transform='rotate(-40 65 87)'/><circle cx='105' cy='100' r='3'/><circle cx='30' cy='95' r='2.5'/><circle cx='65' cy='25' r='2'/></g>`,
  },
  geo: {
    size: 100,
    svg: (c) => `<g fill='none' stroke='${c}' stroke-width='1.5'><polygon points='50,10 90,30 70,70 30,70 10,30'/><circle cx='50' cy='50' r='20'/></g>`,
  },
  mesh: {
    size: 80,
    svg: (c) => `<g fill='none' stroke='${c}' stroke-width='0.8'><polyline points='0,0 40,20 80,0'/><polyline points='0,40 40,60 80,40'/><polyline points='0,80 40,100 80,80'/><line x1='0' y1='0' x2='0' y2='80'/><line x1='40' y1='0' x2='40' y2='100'/><line x1='80' y1='0' x2='80' y2='80'/></g>`,
  },
  aurora: {
    size: 120,
    svg: (c) => `<defs><filter id='blur'><feGaussianBlur in='SourceGraphic' stdDeviation='2'/></filter></defs><g fill='${c}' opacity='0.6' filter='url(#blur)'><ellipse cx='30' cy='40' rx='25' ry='35' transform='rotate(-20 30 40)'/><ellipse cx='90' cy='50' rx='30' ry='40' transform='rotate(30 90 50)'/></g>`,
  },
  hexagons: {
    size: 104,
    svg: (c) => `<g fill='none' stroke='${c}' stroke-width='1.5'><polygon points='52,10 80,26 80,58 52,74 24,58 24,26'/><polygon points='52,50 72,60 72,80 52,90 32,80 32,60'/></g>`,
  },
  circuit: {
    size: 100,
    svg: (c) => `<g fill='none' stroke='${c}' stroke-width='1.2'><circle cx='20' cy='20' r='3' fill='${c}'/><line x1='23' y1='20' x2='40' y2='20'/><line x1='40' y1='20' x2='40' y2='80'/><circle cx='40' cy='80' r='3' fill='${c}'/><circle cx='80' cy='50' r='3' fill='${c}'/><line x1='77' y1='50' x2='60' y2='50'/><line x1='60' y1='50' x2='60' y2='20'/><line x1='60' y1='20' x2='45' y2='20'/></g>`,
  },
  marble: {
    size: 120,
    svg: (c) => `<defs><filter id='marble'><feTurbulence type='fractalNoise' baseFrequency='0.02' numOctaves='5' result='noise' seed='2'/><feDisplacementMap in='SourceGraphic' in2='noise' scale='20'/></filter></defs><rect width='120' height='120' fill='${c}' opacity='0.3' filter='url(#marble)'/>`,
  },
  gradient_waves: {
    size: 100,
    svg: (c) => `<g stroke='${c}' stroke-width='2' fill='none'><path d='M 0 30 Q 25 10, 50 30 T 100 30'/><path d='M 0 50 Q 25 30, 50 50 T 100 50'/><path d='M 0 70 Q 25 50, 50 70 T 100 70'/></g>`,
  },
  bokeh: {
    size: 140,
    svg: (c) => `<g fill='${c}' opacity='0.4'><circle cx='30' cy='40' r='15'/><circle cx='100' cy='70' r='10'/><circle cx='110' cy='30' r='20'/><circle cx='50' cy='110' r='12'/></g>`,
  },
  noise: {
    size: 64,
    svg: (c) => `<g fill='${c}' opacity='0.15'><rect x='5' y='5' width='4' height='4'/><rect x='18' y='12' width='3' height='3'/><rect x='35' y='8' width='5' height='5'/><rect x='50' y='25' width='4' height='4'/><rect x='10' y='40' width='3' height='3'/><rect x='55' y='45' width='4' height='4'/></g>`,
  },
  organic: {
    size: 140,
    svg: (c) => `<g fill='none' stroke='${c}' stroke-width='1.8'><path d='M 20 50 Q 40 30, 60 50 T 100 50'/><path d='M 30 70 Q 50 85, 70 70 T 110 70'/><circle cx='40' cy='30' r='8' fill='none' stroke='${c}' stroke-width='1'/></g>`,
  },
};

export function patternTile(key: PatternKey, color: string) {
  const t = TILES[key];
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${t.size}' height='${t.size}' viewBox='0 0 ${t.size} ${t.size}'>${t.svg(color)}</svg>`;
  return { url: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`, size: t.size };
}

type Preset = {
  label: string; bg: string; fg: string; card: string; muted: string; border: string; primary: string; radius: string;
  // Fondo decorativo (degradados) y tipografía de títulos
  backdrop: string; pattern: PatternKey; serif?: boolean; card_style: CardStyleKey; dark?: boolean;
};

export const THEMES = {
  classic: {
    label: "Clásico", bg: "#ffffff", fg: "#171717", card: "#ffffff", muted: "#f4f4f5", border: "#e4e4e7", primary: "#171717", radius: "0.5rem",
    pattern: "dots",
    backdrop: "radial-gradient(900px 400px at 50% -10%, #e4e4e7 0%, transparent 70%)", card_style: "elevated",
  },
  rosa: {
    label: "Rosa salón", bg: "#fff7f9", fg: "#3b1d29", card: "#ffffff", muted: "#fde8ee", border: "#f6cfda", primary: "#db2777", radius: "1rem",
    pattern: "bubbles",
    backdrop: "radial-gradient(700px 400px at 90% -10%, #fbcfe8 0%, transparent 60%), radial-gradient(600px 400px at -10% 30%, #fde68a55 0%, transparent 60%)", card_style: "elevated",
  },
  barber: {
    label: "Barbería oscuro", bg: "#0f0f10", fg: "#f5f5f4", card: "#1a1a1c", muted: "#27272a", border: "#3f3f46", primary: "#d97706", radius: "0.25rem",
    pattern: "stripes",
    backdrop: "radial-gradient(800px 420px at 50% -10%, #d9770633 0%, transparent 65%)", card_style: "outline", dark: true,
  },
  natural: {
    label: "Natural", bg: "#f6faf5", fg: "#1c2b1f", card: "#ffffff", muted: "#e6f0e3", border: "#cfe0ca", primary: "#2f7d4f", radius: "0.75rem",
    pattern: "leaves",
    backdrop: "radial-gradient(800px 400px at 10% -10%, #bbf7d0 0%, transparent 60%)", card_style: "elevated",
  },
  oceano: {
    label: "Océano", bg: "#f4f9ff", fg: "#0f2236", card: "#ffffff", muted: "#e0eefc", border: "#c7defa", primary: "#2563eb", radius: "0.625rem",
    pattern: "waves",
    backdrop: "linear-gradient(180deg, #bfdbfe 0%, transparent 380px)", card_style: "elevated",
  },
  lavanda: {
    label: "Lavanda", bg: "#faf7ff", fg: "#2a1f3d", card: "#ffffff", muted: "#efe8fb", border: "#ddd0f5", primary: "#7c3aed", radius: "1.25rem",
    pattern: "stars",
    backdrop: "radial-gradient(700px 420px at 100% -10%, #ddd6fe 0%, transparent 60%), radial-gradient(500px 400px at 0% 20%, #fbcfe855 0%, transparent 60%)", card_style: "glass",
  },
  atardecer: {
    label: "Atardecer", bg: "#fff8f1", fg: "#3a2112", card: "#ffffff", muted: "#ffe9d6", border: "#fbd5b0", primary: "#ea580c", radius: "1rem",
    pattern: "confetti",
    backdrop: "linear-gradient(160deg, #fed7aa 0%, #fecdd3 35%, transparent 70%)", card_style: "glass",
  },
  medianoche: {
    label: "Medianoche", bg: "#0b1020", fg: "#e8ecf8", card: "#141b33", muted: "#1c2545", border: "#2a3562", primary: "#6366f1", radius: "0.875rem",
    pattern: "stars",
    backdrop: "radial-gradient(800px 450px at 80% -10%, #6366f155 0%, transparent 60%), radial-gradient(600px 400px at 0% 10%, #22d3ee22 0%, transparent 60%)", card_style: "glass", dark: true,
  },
  elegante: {
    label: "Elegante", bg: "#faf7f2", fg: "#2b2118", card: "#fffdf9", muted: "#f1e9dc", border: "#e3d5bf", primary: "#9a6b2f", radius: "0.125rem",
    pattern: "diamonds",
    backdrop: "linear-gradient(180deg, #efe3cf 0%, transparent 320px)", serif: true, card_style: "outline",
  },
  neon: {
    label: "Neón", bg: "#09090b", fg: "#fafafa", card: "#131316", muted: "#1c1c21", border: "#2e2e36", primary: "#22d3ee", radius: "0.75rem",
    pattern: "circuit",
    backdrop: "radial-gradient(700px 400px at 20% -10%, #22d3ee33 0%, transparent 60%), radial-gradient(700px 400px at 90% 0%, #e879f933 0%, transparent 60%)", card_style: "glass", dark: true,
  },
  menta: {
    label: "Menta", bg: "#f2fbf9", fg: "#0f2b27", card: "#ffffff", muted: "#d9f3ee", border: "#b7e6dd", primary: "#0d9488", radius: "1.5rem",
    pattern: "organic",
    backdrop: "radial-gradient(800px 400px at 50% -15%, #99f6e4 0%, transparent 65%)", card_style: "elevated",
  },
  cereza: {
    label: "Cereza", bg: "#fff5f5", fg: "#3b1114", card: "#ffffff", muted: "#fde3e3", border: "#f8c4c4", primary: "#dc2626", radius: "0.5rem",
    pattern: "bokeh",
    backdrop: "linear-gradient(180deg, #fecaca 0%, transparent 340px)", card_style: "elevated",
  },
  aurora: {
    label: "Aurora boreal", bg: "#0d1b2a", fg: "#e3f2fd", card: "#162a47", muted: "#1e3a5f", border: "#2c5aa0", primary: "#00d4ff", radius: "0.75rem",
    pattern: "aurora",
    backdrop: "linear-gradient(135deg, #00d4ff22 0%, #22d3ee11 50%, #00d4ff22 100%)", card_style: "glass", dark: true,
  },
  tierra: {
    label: "Tierra", bg: "#f5f3f0", fg: "#3e2723", card: "#fffaf9", muted: "#efebe9", border: "#d7ccc8", primary: "#6d4c41", radius: "0.5rem",
    pattern: "mesh",
    backdrop: "linear-gradient(180deg, #d7ccc8 0%, transparent 300px)", card_style: "outline",
  },
  profundo: {
    label: "Profundo azul", bg: "#0f1823", fg: "#e0e8f2", card: "#1a2a42", muted: "#283d5e", border: "#3a5a8a", primary: "#4a9eff", radius: "1rem",
    pattern: "gradient_waves",
    backdrop: "linear-gradient(135deg, #4a9eff22 0%, #2563eb11 50%, #1e40af22 100%)", card_style: "glass", dark: true,
  },
  dorado: {
    label: "Dorado premium", bg: "#fefaf0", fg: "#5a3a1a", card: "#fffcf7", muted: "#f0e6d2", border: "#d4b896", primary: "#d4a574", radius: "1rem",
    pattern: "hexagons",
    backdrop: "radial-gradient(900px 450px at 50% -20%, #f5deb3 0%, transparent 70%)", card_style: "elevated",
  },
  minimalista: {
    label: "Minimalista", bg: "#ffffff", fg: "#1f2937", card: "#ffffff", muted: "#f3f4f6", border: "#d1d5db", primary: "#6b7280", radius: "0.25rem",
    pattern: "grid",
    backdrop: "linear-gradient(180deg, #f3f4f6 0%, transparent 200px)", card_style: "flat",
  },
  acuarela: {
    label: "Acuarela", bg: "#faf9f6", fg: "#4a3728", card: "#fffbf5", muted: "#f5ede3", border: "#e8d9c9", primary: "#b8860b", radius: "1.25rem",
    pattern: "organic",
    backdrop: "radial-gradient(800px 400px at 30% -10%, #ffcc99 0%, transparent 60%), radial-gradient(600px 400px at 80% 20%, #ff99cc 0%, transparent 60%)", card_style: "glass",
  },
  moderno: {
    label: "Moderno tech", bg: "#0f172a", fg: "#f1f5f9", card: "#1e293b", muted: "#334155", border: "#475569", primary: "#0ea5e9", radius: "0.5rem",
    pattern: "geo",
    backdrop: "radial-gradient(800px 400px at 80% -10%, #0ea5e944 0%, transparent 65%), radial-gradient(600px 400px at 10% 30%, #06b6d444 0%, transparent 60%)", card_style: "outline", dark: true,
  },
  sunset: {
    label: "Puesta de sol", bg: "#fff9e6", fg: "#4a2c1a", card: "#fffdf5", muted: "#ffeaa7", border: "#ffcc99", primary: "#ff6b35", radius: "1rem",
    pattern: "bokeh",
    backdrop: "linear-gradient(180deg, #ff6b35 0%, #ffa500 30%, #ffeb3b 70%, transparent 100%)", card_style: "glass",
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
export function resolvePattern(pattern: string | null | undefined, theme: string | null | undefined): PatternKey | null {
  if (pattern === "none") return null;
  return pattern && pattern in PATTERNS ? (pattern as PatternKey) : resolveTheme(theme).pattern;
}

export function themeStyle(theme: string | null, brand: string | null, cardStyle?: string | null, pattern?: string | null): CSSProperties {
  const t = resolveTheme(theme);
  const primary = isHex(brand) ? brand : t.primary;
  const cs = resolveCardStyle(cardStyle, theme);
  const shadow = t.dark ? "0 10px 30px -12px rgb(0 0 0 / 0.7)" : "0 10px 30px -14px rgb(0 0 0 / 0.25), 0 2px 6px -2px rgb(0 0 0 / 0.08)";
  const pk = resolvePattern(pattern, theme);
  // El dibujo usa el color de marca, muy tenue (más en fondos oscuros)
  const tile = pk ? patternTile(pk, primary) : null;
  return {
    "--bk-pattern": tile?.url ?? "none",
    "--bk-pattern-size": `${tile?.size ?? 100}px`,
    "--bk-pattern-opacity": t.dark ? "0.16" : "0.11",
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
