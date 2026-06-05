"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// ── Editar organización ───────────────────────────────────────
const EditOrgSchema = z.object({
  name:              z.string().min(2),
  currency:          z.enum(["NIO", "USD"]),
  settlement_model:  z.enum(["commission", "space_fee", "both", "none"]),
  settlement_period: z.enum(["quincenal", "mensual"]),
  active:            z.coerce.boolean(),
});

export async function updateOrganization(orgId: string, formData: FormData) {
  const parsed = EditOrgSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "superadmin") return { error: "Sin permisos" };

  const admin = createAdminClient();
  const { error } = await admin.from("organizations").update(parsed.data).eq("id", orgId);
  if (error) return { error: error.message };

  revalidatePath(`/admin/${orgId}`);
  revalidatePath("/admin");
  return { success: true };
}

// ── Crear usuario para una org ────────────────────────────────
const CreateUserSchema = z.object({
  full_name: z.string().min(1),
  email:     z.string().email(),
  password:  z.string().min(8),
  role:      z.enum(["owner", "brand"]),
});

export async function createOrgUser(orgId: string, formData: FormData) {
  const parsed = CreateUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "superadmin") return { error: "Sin permisos" };

  const admin = createAdminClient();
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email:         parsed.data.email,
    password:      parsed.data.password,
    email_confirm: true,
  });
  if (authError) return { error: authError.message };

  const { error: profileError } = await admin.from("profiles").insert({
    id:              authData.user.id,
    role:            parsed.data.role,
    organization_id: orgId,
    full_name:       parsed.data.full_name,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return { error: profileError.message };
  }

  revalidatePath(`/admin/${orgId}`);
  return { success: true };
}
