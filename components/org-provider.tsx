"use client";

import { createContext, useContext } from "react";
import type { CurrencyCode, ModuleId, VerticalType } from "@/types/database";
import { formatMoney, DEFAULT_EXCHANGE_RATE } from "@/lib/money";

interface OrgContextValue {
  currency:     CurrencyCode;
  exchangeRate: number;
  orgName:      string;
  vertical:     VerticalType;
  modules:      readonly string[];
}

const OrgContext = createContext<OrgContextValue>({
  currency:     "NIO",
  exchangeRate: DEFAULT_EXCHANGE_RATE,
  orgName:      "",
  vertical:     "colectivo",
  modules:      [],
});

export function OrgProvider({
  children,
  currency,
  exchangeRate,
  orgName,
  vertical = "colectivo",
  modules = [],
}: {
  children:     React.ReactNode;
  currency:     CurrencyCode;
  exchangeRate: number;
  orgName:      string;
  vertical?:    VerticalType;
  modules?:     readonly string[];
}) {
  return (
    <OrgContext.Provider value={{ currency, exchangeRate, orgName, vertical, modules }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  return useContext(OrgContext);
}

/** Hook para saber si un módulo está activo en la org (componentes cliente). */
export function useHasModule(id: ModuleId) {
  const { modules } = useOrg();
  return modules.includes(id);
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
