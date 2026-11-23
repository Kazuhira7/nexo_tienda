"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const SettingsSchema = z.object({
  trial_days:      z.coerce.number().int().min(0).max(90),
  grace_days:      z.coerce.number().int().min(0).max(30),
  warn_days:       z.coerce.number().int().min(0).max(30),
  fee_restaurante: z.coerce.number().min(0),
  fee_retail:      z.coerce.number().min(0),
  fee_colectivo:   z.coerce.number().min(0),
  sales_whatsapp:  z.string().max(20).transform((v) => v.replace(/\D/g, "") || null),
  support_hours:   z.string().min(1).max(100),
});

// RLS on platform_settings only lets the superadmin (with aal2) write.
export async function updatePlatformSettings(formData: FormData) {
  const parsed = SettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_settings")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", 1)
    .select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Sin permisos para cambiar los ajustes" };

  await supabase.rpc("admin_log", { p_action: "ajustes_actualizados", p_details: parsed.data });
  revalidatePath("/admin/ajustes");
  return { success: true };
}
