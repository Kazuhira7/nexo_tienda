import { formatMoney } from "@/lib/money";
import { getOrgContext } from "@/lib/org-context";

/**
 * Devuelve un formateador que convierte NIO → moneda de la org.
 * Ejemplo: si la org es USD con tasa 36.63:
 *   fmt(3663) → "$100.00"
 *   fmt(1000) → "$27.30"
 */
export async function getMoney() {
  const { currency, exchangeRate } = await getOrgContext();
  return (amountNIO: number) => formatMoney(amountNIO, currency, exchangeRate);
}

export { formatMoney };
