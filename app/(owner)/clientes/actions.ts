"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { z } from "zod";

const CustomerSchema = z.object({
  name:  z.string().min(1, "El nombre es requerido"),
  phone: z.string().optional(),
  email: z.string().email("Correo inválido").optional().or(z.literal("")),
  notes: z.string().optional(),
});

export async function createCustomer(formData: FormData) {
  const parsed = CustomerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const orgId = await getOrgId();

  const { error } = await supabase.from("customers").insert({
    ...parsed.data,
    organization_id: orgId,
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
    notes: parsed.data.notes || null,
  });

  if (error) return { error: error.message };
  revalidatePath("/clientes");
  return { success: true };
}

export async function updateCustomer(id: string, formData: FormData) {
  const parsed = CustomerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({
      ...parsed.data,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      notes: parsed.data.notes || null,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/clientes");
  return { success: true };
}
