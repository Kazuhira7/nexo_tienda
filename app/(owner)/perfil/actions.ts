"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// profiles has no self-UPDATE policy (role, org and brand must never be self-editable), so the
// name is written with the service role — only full_name, only on the caller's own row.
export async function updateProfileName(_userId: string, fullName: string) {
  const name = fullName.trim();
  if (!name) return { error: "El nombre no puede estar vacío" };
  if (name.length > 80) return { error: "El nombre es muy largo" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await createAdminClient().from("profiles").update({ full_name: name }).eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { success: true };
}
