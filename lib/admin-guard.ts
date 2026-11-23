// Server-side superadmin check for admin Server Actions (they write with the service role, so
// this is their only gate). Uses the database's is_superadmin(): role + second factor (018).
import { createClient } from "@/lib/supabase/server";

export async function isSuperadmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_superadmin");
  return data === true;
}

export const NOT_SUPERADMIN = "Sin permisos. Vuelve a entrar al panel con tu código de verificación.";
