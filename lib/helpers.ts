import { createClient } from "@/lib/supabase/server";
// Re-export pure money utils so existing imports keep working
export { formatMoney, currencySymbol, DEFAULT_EXCHANGE_RATE } from "@/lib/money";

// ─── Perfil completo del usuario actual ──────────────────────────────────
export async function getCurrentProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, brand_id, organization_id, full_name, organizations(id, name, currency, settlement_model, settlement_period, exchange_rate)")
    .eq("id", user.id)
    .single();

  return profile ?? null;
}

// ─── Organización del usuario actual ─────────────────────────────────────
export async function getCurrentOrg() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;

  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", profile.organization_id)
    .single();

  return org ?? null;
}
