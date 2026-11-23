// Subscription gate (017): is the user's business open (trial, paid, grace, exempt) or blocked?
// my_org_access() is SECURITY DEFINER, so it answers even while RLS hides the blocked org's data.
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { OrgAccess } from "@/types/database";

export const getOrgAccess = cache(async (): Promise<OrgAccess | null> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_org_access");
  return data ?? null;
});

/** Layout guard: a blocked business (trial over, unpaid, suspended) goes to /suscripcion. */
export async function requireOpenOrg(): Promise<OrgAccess | null> {
  const access = await getOrgAccess();
  if (access && !access.is_open) redirect("/suscripcion");
  return access;
}

/** Days-left banner for the owner: only while the trial runs or the payment is about to lapse. */
export function billingNotice(access: OrgAccess | null): { tone: "info" | "warn"; text: string } | null {
  if (!access?.is_open || access.days_left == null) return null;
  const d = access.days_left;
  const days = d === 1 ? "1 día" : `${d} días`;
  switch (access.status) {
    case "prueba":
      return { tone: d <= 3 ? "warn" : "info", text: d === 0 ? "Tu prueba gratis termina hoy" : `Te quedan ${days} de prueba gratis` };
    case "por_vencer":
      return { tone: "info", text: d === 0 ? "Tu mensualidad vence hoy" : `Tu mensualidad vence en ${days}` };
    case "gracia":
      return { tone: "warn", text: `Tu mensualidad venció. Tienes ${days} para pagar antes de que se bloquee el acceso` };
    default:
      return null;
  }
}
