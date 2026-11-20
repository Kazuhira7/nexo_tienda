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
  // Datos del ticket (restaurante) — opcionales
  ticket_address:    z.string().trim().max(120).optional(),
  ticket_phone:      z.string().trim().max(40).optional(),
  ticket_tax_id:     z.string().trim().max(30).optional(),
  ticket_footer:     z.string().trim().max(120).optional(),
});

export async function updateOrgSettings(orgId: string, formData: FormData) {
  const parsed = Schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { ticket_address, ticket_phone, ticket_tax_id, ticket_footer, ...base } = parsed.data;
  const ticket = Object.fromEntries(
    Object.entries({ ticket_address, ticket_phone, ticket_tax_id, ticket_footer })
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, v || null])
  );

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .update({ ...base, ...ticket })
    .eq("id", orgId)
    .select("id");

  if (error) return { error: error.message };
  if (!data?.length) return { error: "Solo la administradora puede cambiar la configuración" };
  revalidatePath("/configuracion");
  revalidatePath("/dashboard");
  return { success: true };
}
