import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const money = (n: number, currency = "EUR") =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(n);
