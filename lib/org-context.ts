// Server-side org context, memoized per request with React.cache.
// Single source of truth for org name, currency, vertical and enabled modules.
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_EXCHANGE_RATE } from "@/lib/money";
import type { CurrencyCode, ModuleId, VerticalType } from "@/types/database";

export interface OrgContext {
  orgId:        string | null;
  orgName:      string;
  currency:     CurrencyCode;
  exchangeRate: number;
  vertical:     VerticalType;
  modules:      ModuleId[];
}

const FALLBACK: OrgContext = {
  orgId:        null,
  orgName:      "",
  currency:     "NIO",
  exchangeRate: DEFAULT_EXCHANGE_RATE,
  vertical:     "colectivo",
  modules:      [],
};

export const getOrgContext = cache(async (): Promise<OrgContext> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return FALLBACK;

  const { data } = await supabase
    .from("profiles")
    .select("organization_id, organizations(name, currency, exchange_rate, vertical, enabled_modules)")
    .eq("id", user.id)
    .single();

  const org = data?.organizations as {
    name:            string;
    currency:        CurrencyCode;
    exchange_rate:   number;
    vertical:        VerticalType;
    enabled_modules: ModuleId[];
  } | null;

  if (!org) return FALLBACK;

  return {
    orgId:        data?.organization_id ?? null,
    orgName:      org.name,
    currency:     org.currency ?? "NIO",
    exchangeRate: org.exchange_rate ?? DEFAULT_EXCHANGE_RATE,
    vertical:     org.vertical ?? "colectivo",
    modules:      org.enabled_modules ?? [],
  };
});
