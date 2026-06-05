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
  if (currency === "USD") {
    const usd = rounded / exchangeRate;
    return `$${usd.toFixed(2)}`;
  }
  return `C$${rounded.toFixed(2)}`;
}

export function currencySymbol(currency: CurrencyCode = "NIO"): string {
  return currency === "USD" ? "$" : "C$";
}
