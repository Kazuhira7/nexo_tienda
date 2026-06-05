import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, DEFAULT_EXCHANGE_RATE } from "@/lib/money";
import type { CurrencyCode } from "@/types/database";

// Datos de moneda de la org — cacheado por request con React.cache
export const getOrgMoneyConfig = cache(async (): Promise<{
  currency: CurrencyCode;
  exchangeRate: number;
}> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { currency: "NIO", exchangeRate: DEFAULT_EXCHANGE_RATE };

  const { data } = await supabase
    .from("profiles")
    .select("organizations(currency, exchange_rate)")
    .eq("id", user.id)
    .single();

  const org = data?.organizations as { currency: CurrencyCode; exchange_rate: number } | null;
  return {
    currency:     org?.currency     ?? "NIO",
    exchangeRate: org?.exchange_rate ?? DEFAULT_EXCHANGE_RATE,
  };
});

/**
 * Devuelve un formateador que convierte NIO → moneda de la org.
 * Ejemplo: si la org es USD con tasa 36.63:
 *   fmt(3663) → "$100.00"
 *   fmt(1000) → "$27.30"
 */
export async function getMoney() {
  const { currency, exchangeRate } = await getOrgMoneyConfig();
  return (amountNIO: number) => formatMoney(amountNIO, currency, exchangeRate);
}

export { formatMoney };
