"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const OrgSchema = z.object({
  name:               z.string().min(2, "Nombre mínimo 2 caracteres"),
  slug:               z.string().min(2).regex(/^[a-z0-9-]+$/, "Solo letras minúsculas, números y guiones"),
  currency:           z.enum(["NIO", "USD"]),
  settlement_model:   z.enum(["commission", "space_fee", "both", "none"]),
  settlement_period:  z.enum(["quincenal", "mensual"]),
  owner_email:        z.string().email("Correo inválido"),
  owner_password:     z.string().min(8, "Mínimo 8 caracteres"),
  owner_name:         z.string().min(1, "El nombre es requerido"),
});

export async function createOrganization(formData: FormData) {
  const parsed = OrgSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Verify caller is superadmin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "superadmin") return { error: "Sin permisos" };

  const admin = createAdminClient();
  const { name, slug, currency, settlement_model, settlement_period, owner_email, owner_password, owner_name } = parsed.data;

  // Create organization
  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({ name, slug, currency, settlement_model, settlement_period })
    .select("id")
    .single();

  if (orgError) return { error: `Error creando organización: ${orgError.message}` };

  // Create owner auth user
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email:         owner_email,
    password:      owner_password,
    email_confirm: true,
  });

  if (authError) {
    // Rollback org
    await admin.from("organizations").delete().eq("id", org.id);
    return { error: `Error creando usuario: ${authError.message}` };
  }

  // Create owner profile
  const { error: profileError } = await admin.from("profiles").insert({
    id:              authData.user.id,
    role:            "owner",
    brand_id:        null,
    organization_id: org.id,
    full_name:       owner_name,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    await admin.from("organizations").delete().eq("id", org.id);
    return { error: `Error creando perfil: ${profileError.message}` };
  }

  redirect("/admin");
}
