export type PlanId = "starter" | "growth" | "pro";

export const PLAN_ORDER: PlanId[] = ["starter", "growth", "pro"];

export type PlanDef = {
  id: PlanId;
  name: string;
  monthly: number;
  yearlyMonthly: number; // precio mensual equivalente con pago anual (-20 %)
  yearlyTotal: number;
  audience: string;
  maxProfessionals: number;
  maxLoyaltyTiers: number;
  customDomain: boolean;
  inventory: boolean;
  invoicing: boolean;
  reports: boolean;
  support: string;
  features: string[];
};

export const PLANS: Record<PlanId, PlanDef> = {
  starter: {
    id: "starter", name: "Starter", monthly: 19, yearlyMonthly: 15, yearlyTotal: 180,
    audience: "Barberos y peluqueros independientes",
    maxProfessionals: 1, maxLoyaltyTiers: 1, customDomain: false, inventory: false, invoicing: false, reports: false,
    support: "Email (24-48 h)",
    features: ["1 profesional (agenda individual)", "Reserva online con enlace personalizado", "Fidelización básica de sellos", "Agenda, citas y base de clientes"],
  },
  growth: {
    id: "growth", name: "Growth", monthly: 39, yearlyMonthly: 31, yearlyTotal: 372,
    audience: "Barberías y salones de 2 a 5 profesionales",
    maxProfessionals: 5, maxLoyaltyTiers: 2, customDomain: false, inventory: true, invoicing: true, reports: false,
    support: "Email y WhatsApp prioritario",
    features: ["Hasta 5 profesionales con horarios independientes", "Fidelización personalizable (premios a los 5 y 10 sellos)", "Control de inventario", "Facturación y presupuestos"],
  },
  pro: {
    id: "pro", name: "Pro", monthly: 79, yearlyMonthly: 63, yearlyTotal: 756,
    audience: "Franquicias y negocios con varias sedes (precio por sede)",
    maxProfessionals: 50, maxLoyaltyTiers: 10, customDomain: true, inventory: true, invoicing: true, reports: true,
    support: "Gestor de cuenta y teléfono",
    features: ["Todo lo de Growth", "Profesionales ilimitados", "Dominio propio (reservas.mi-barberia.com)", "Fidelización con múltiples niveles", "Reportes analíticos avanzados"],
  },
};

export type Feature = "inventory" | "invoicing" | "reports" | "customDomain";

// Plan mínimo que desbloquea cada función
export const FEATURE_MIN_PLAN: Record<Feature, PlanId> = {
  inventory: "growth", invoicing: "growth", reports: "pro", customDomain: "pro",
};

export const FEATURE_LABEL: Record<Feature, string> = {
  inventory: "Inventario", invoicing: "Facturación", reports: "Reportes analíticos", customDomain: "Dominio propio",
};

export function parsePlan(value: unknown): PlanId {
  return value === "growth" || value === "pro" ? value : "starter";
}

export function hasFeature(plan: PlanId, feature: Feature): boolean {
  return PLANS[plan][feature];
}

export function planError(feature: Feature): string {
  return `${FEATURE_LABEL[feature]} está disponible desde el plan ${PLANS[FEATURE_MIN_PLAN[feature]].name}.`;
}

// Marca "Powered by" en la página pública: se retira con el plan Pro (marca blanca)
export const showPoweredBy = (plan: PlanId) => plan !== "pro";

// Exportación CSV: neutraliza fórmulas (=, +, -, @) para que Excel no las ejecute
export function csv(rows: (string | number | null | undefined)[][]): string {
  const cell = (v: string | number | null | undefined) => {
    let s = v == null ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "\uFEFF" + rows.map((r) => r.map(cell).join(";")).join("\r\n");
}
