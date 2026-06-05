"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { z } from "zod";

const BrandSchema = z.object({
  name:            z.string().min(1, "El nombre es requerido"),
  contact_name:    z.string().optional(),
  phone:           z.string().optional(),
  email:           z.string().email("Correo inválido").optional().or(z.literal("")),
  space_fee:       z.coerce.number().min(0),
  commission_rate: z.coerce.number().min(0).max(100),
});

export async function createBrand(formData: FormData) {
  const parsed = BrandSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const orgId = await getOrgId();

  const { error } = await supabase.from("brands").insert({
    ...parsed.data,
    organization_id: orgId,
    email:        parsed.data.email || null,
    contact_name: parsed.data.contact_name || null,
    phone:        parsed.data.phone || null,
  });

  if (error) return { error: error.message };
  revalidatePath("/marcas");
  return { success: true };
}

export async function updateBrand(id: string, formData: FormData) {
  const parsed = BrandSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("brands")
    .update({
      ...parsed.data,
      email:        parsed.data.email || null,
      contact_name: parsed.data.contact_name || null,
      phone:        parsed.data.phone || null,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/marcas");
  return { success: true };
}

export async function toggleBrandActive(id: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("brands").update({ active }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/marcas");
  return { success: true };
}
