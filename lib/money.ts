// Funciones PURAS de formateo de moneda — seguras para cliente y servidor
// NO importar nada de supabase/server aquí

import type { CurrencyCode } from "@/types/database";

export const DEFAULT_EXCHANGE_RATE = 36.63;

/**
 * Formatea un monto NIO con conversión si la moneda es USD.
 * Los montos en BD siempre están en NIO.
 */
export function formatMoney(
  amountNIO: number,
  currency: CurrencyCode = "NIO",
  exchangeRate: number = DEFAULT_EXCHANGE_RATE
): string {
  const rounded = Math.round(amountNIO * 100) / 100;
  if (currency === "USD") return `$${GROUPED.format(rounded / exchangeRate)}`;
  return `C$${GROUPED.format(rounded)}`;
}

// "1,560.00": comma thousands, dot decimals, as written in Nicaragua
const GROUPED = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function currencySymbol(currency: CurrencyCode = "NIO"): string {
  return currency === "USD" ? "$" : "C$";
}
