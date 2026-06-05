"use client";

import { createContext, useContext } from "react";
import type { CurrencyCode } from "@/types/database";
import { formatMoney, DEFAULT_EXCHANGE_RATE } from "@/lib/money";

interface OrgContextValue {
  currency:     CurrencyCode;
  exchangeRate: number;
  orgName:      string;
}

const OrgContext = createContext<OrgContextValue>({
  currency:     "NIO",
  exchangeRate: DEFAULT_EXCHANGE_RATE,
  orgName:      "",
});

export function OrgProvider({
  children,
  currency,
  exchangeRate,
  orgName,
}: {
  children:     React.ReactNode;
  currency:     CurrencyCode;
  exchangeRate: number;
  orgName:      string;
}) {
  return (
    <OrgContext.Provider value={{ currency, exchangeRate, orgName }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  return useContext(OrgContext);
}

/**
 * Hook para formatear montos en componentes cliente.
 * Los montos deben estar en NIO — la conversión es automática.
 * Ejemplo: useMoney()(3663) → "$100.00" si la org es USD con tasa 36.63
 */
export function useMoney() {
  const { currency, exchangeRate } = useOrg();
  return (amountNIO: number) => formatMoney(amountNIO, currency, exchangeRate);
}
