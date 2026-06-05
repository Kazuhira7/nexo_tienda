/**
 * Server-side helper: returns the organization_id of the authenticated user.
 * Call from Server Actions that need to stamp organization_id on new records.
 */
import { createClient } from "@/lib/supabase/server";

export async function getOrgId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuario no autenticado");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) throw new Error("Usuario sin organización");
  return profile.organization_id;
}
