"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const Schema = z.object({
  email:     z.string().email("Correo inválido"),
  password:  z.string().min(8, "Mínimo 8 caracteres"),
  full_name: z.string().min(1, "El nombre es requerido"),
});

export async function createBrandUser(brandId: string, formData: FormData) {
  const parsed = Schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // The service role skips RLS: check here that the caller owns the business and the brand is theirs
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };
  const { data: me } = await supabase.from("profiles").select("role, organization_id").eq("id", user.id).single();
  if (me?.role !== "owner" || !me.organization_id) return { error: "Solo la dueña puede crear accesos de marca" };
  const { data: brand } = await supabase.from("brands").select("id").eq("id", brandId).maybeSingle();
  if (!brand) return { error: "Marca no encontrada" };

  const admin = createAdminClient();
  const orgId = me.organization_id;

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email:         parsed.data.email,
    password:      parsed.data.password,
    email_confirm: true,
  });

  if (authError) return { error: authError.message };

  const { error: profileError } = await admin.from("profiles").insert({
    id:              authData.user.id,
    role:            "brand",
    brand_id:        brandId,
    organization_id: orgId,
    full_name:       parsed.data.full_name,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return { error: profileError.message };
  }

  revalidatePath("/marcas");
  return { success: true };
}
