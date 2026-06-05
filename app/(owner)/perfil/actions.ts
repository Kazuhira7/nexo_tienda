"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateProfileName(userId: string, fullName: string) {
  if (!fullName.trim()) return { error: "El nombre no puede estar vacío" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName.trim() })
    .eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath("/perfil");
  return { success: true };
}
