"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const Schema = z.object({
  name:              z.string().min(2, "Nombre mínimo 2 caracteres"),
  currency:          z.enum(["NIO", "USD"]),
  settlement_model:  z.enum(["commission", "space_fee", "both", "none"]),
  settlement_period: z.enum(["quincenal", "mensual"]),
  exchange_rate:     z.coerce.number().min(1, "La tasa debe ser mayor a 1"),
});

export async function updateOrgSettings(orgId: string, formData: FormData) {
  const parsed = Schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update(parsed.data)
    .eq("id", orgId);

  if (error) return { error: error.message };
  revalidatePath("/configuracion");
  revalidatePath("/dashboard");
  return { success: true };
}
