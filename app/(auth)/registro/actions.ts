"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { VERTICAL_PRESETS } from "@/lib/modules";
import { z } from "zod";

const RegisterSchema = z.object({
  business_name: z.string().min(2, "El nombre del negocio es muy corto").max(80),
  vertical:      z.enum(["colectivo", "retail", "restaurante"]),
  owner_name:    z.string().min(1, "Tu nombre es requerido").max(80),
  email:         z.string().email("Correo inválido"),
  password:      z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base || "negocio"}-${suffix}`;
}

// Public self-service signup: creates auth user + organization + owner profile.
// No role/slug/modules come from the client — only safe, validated fields.
export async function registerBusiness(formData: FormData) {
  const parsed = RegisterSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { business_name, vertical, owner_name, email, password } = parsed.data;
  const admin = createAdminClient();

  // 1. Auth user
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: owner_name },
  });
  if (authError) {
    const msg = authError.message.includes("already")
      ? "Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña."
      : authError.message;
    return { error: msg };
  }

  // 2. Organization with the vertical's module preset
  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({
      name: business_name,
      slug: slugify(business_name),
      vertical,
      enabled_modules: VERTICAL_PRESETS[vertical],
    })
    .select("id")
    .single();

  if (orgError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return { error: `No se pudo crear el negocio: ${orgError.message}` };
  }

  // 3. Owner profile (the auth trigger may have pre-created a partial row)
  const { error: profileError } = await admin.from("profiles").upsert({
    id:              authData.user.id,
    role:            "owner",
    brand_id:        null,
    organization_id: org.id,
    full_name:       owner_name,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    await admin.from("organizations").delete().eq("id", org.id);
    return { error: `No se pudo crear tu perfil: ${profileError.message}` };
  }

  return { success: true };
}
