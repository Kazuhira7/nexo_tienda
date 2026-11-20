// Server-side org context, memoized per request with React.cache.
// Single source of truth for org name, currency, timezone, vertical and enabled modules.
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_EXCHANGE_RATE } from "@/lib/money";
import { DEFAULT_TIMEZONE } from "@/lib/dates";
import type { CurrencyCode, ModuleId, VerticalType } from "@/types/database";

export interface OrgContext {
  orgId:        string | null;
  orgName:      string;
  currency:     CurrencyCode;
  exchangeRate: number;
  vertical:     VerticalType;
  modules:      ModuleId[];
  timezone:     string;
  ticket:       TicketInfo;
}

/** Business data printed on tickets (pre-cuenta, recibo, comanda). */
export interface TicketInfo {
  address: string | null;
  phone:   string | null;
  taxId:   string | null;
  footer:  string | null;
}

const NO_TICKET: TicketInfo = { address: null, phone: null, taxId: null, footer: null };

const FALLBACK: OrgContext = {
  orgId:        null,
  orgName:      "",
  currency:     "NIO",
  exchangeRate: DEFAULT_EXCHANGE_RATE,
  vertical:     "colectivo",
  modules:      [],
  timezone:     DEFAULT_TIMEZONE,
  ticket:       NO_TICKET,
};

export const getOrgContext = cache(async (): Promise<OrgContext> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return FALLBACK;

  const { data } = await supabase
    .from("profiles")
    .select("organization_id, organizations(name, currency, exchange_rate, vertical, enabled_modules, timezone, ticket_address, ticket_phone, ticket_tax_id, ticket_footer)")
    .eq("id", user.id)
    .single();

  const org = data?.organizations as {
    name:            string;
    currency:        CurrencyCode;
    exchange_rate:   number;
    vertical:        VerticalType;
    enabled_modules: ModuleId[];
    timezone:        string;
    ticket_address:  string | null;
    ticket_phone:    string | null;
    ticket_tax_id:   string | null;
    ticket_footer:   string | null;
  } | null;

  if (!org) return FALLBACK;

  return {
    orgId:        data?.organization_id ?? null,
    orgName:      org.name,
    currency:     org.currency ?? "NIO",
    exchangeRate: org.exchange_rate ?? DEFAULT_EXCHANGE_RATE,
    vertical:     org.vertical ?? "colectivo",
    modules:      org.enabled_modules ?? [],
    timezone:     org.timezone ?? DEFAULT_TIMEZONE,
    ticket: {
      address: org.ticket_address,
      phone:   org.ticket_phone,
      taxId:   org.ticket_tax_id,
      footer:  org.ticket_footer,
    },
  };
});
