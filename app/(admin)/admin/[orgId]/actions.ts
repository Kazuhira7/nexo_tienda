"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSuperadmin, NOT_SUPERADMIN } from "@/lib/admin-guard";
import { MODULE_IDS } from "@/lib/modules";
import type { ModuleId } from "@/types/database";
import { z } from "zod";

// ── Editar organización ───────────────────────────────────────
const EditOrgSchema = z.object({
  name:              z.string().min(2),
  currency:          z.enum(["NIO", "USD"]),
  settlement_model:  z.enum(["commission", "space_fee", "both", "none"]),
  settlement_period: z.enum(["quincenal", "mensual"]),
});

export async function updateOrganization(orgId: string, formData: FormData) {
  const parsed = EditOrgSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  if (!(await isSuperadmin())) return { error: NOT_SUPERADMIN };

  const admin = createAdminClient();
  const { error } = await admin.from("organizations").update(parsed.data).eq("id", orgId);
  if (error) return { error: error.message };

  revalidatePath(`/admin/${orgId}`);
  revalidatePath("/admin");
  return { success: true };
}

// ── Módulos activos de una org ────────────────────────────────
const ModulesSchema = z.array(z.enum(MODULE_IDS as [ModuleId, ...ModuleId[]]));

export async function updateOrgModules(orgId: string, modules: string[]) {
  const parsed = ModulesSchema.safeParse(modules);
  if (!parsed.success) return { error: "Módulos inválidos" };

  if (!(await isSuperadmin())) return { error: NOT_SUPERADMIN };

  const admin = createAdminClient();
  const { error } = await admin
    .from("organizations")
    .update({ enabled_modules: parsed.data })
    .eq("id", orgId);
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
  role:      z.enum(["owner", "brand", "terminal"]),
});

export async function createOrgUser(orgId: string, formData: FormData) {
  const parsed = CreateUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  if (!(await isSuperadmin())) return { error: NOT_SUPERADMIN };

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

// ── Cobro: datos, pagos y notas (RPCs de 017; la base exige superadmin con aal2) ──
const BillingSchema = z.object({
  active:         z.boolean(),
  billing_exempt: z.boolean(),
  monthly_fee:    z.number().min(0).max(1_000_000).nullable(),
  owner_phone:    z.string().max(30).nullable(),
  trial_ends_at:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
});

export async function updateBilling(orgId: string, input: z.input<typeof BillingSchema>) {
  const parsed = BillingSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { trial_ends_at, ...rest } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_billing", {
    p_org: orgId,
    p_patch: {
      ...rest,
      // end of that day in Managua
      ...(trial_ends_at ? { trial_ends_at: `${trial_ends_at}T23:59:59-06:00` } : {}),
    },
  });
  if (error) return { error: error.message };

  revalidatePath(`/admin/${orgId}`);
  revalidatePath("/admin");
  return { success: true };
}

const PaymentSchema = z.object({
  amount:  z.coerce.number().min(0, "Monto inválido"),
  months:  z.coerce.number().int().min(1).max(24),
  method:  z.enum(["efectivo", "transferencia", "tarjeta", "otro"]),
  paid_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  notes:   z.string().max(500).optional(),
});

export async function recordPayment(orgId: string, formData: FormData) {
  const parsed = PaymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_record_payment", {
    p_org:     orgId,
    p_amount:  parsed.data.amount,
    p_months:  parsed.data.months,
    p_method:  parsed.data.method,
    p_paid_at: parsed.data.paid_at,
    p_notes:   parsed.data.notes || null,
  });
  if (error) return { error: error.message };

  revalidatePath(`/admin/${orgId}`);
  revalidatePath("/admin");
  return { success: true, until: data?.period_end };
}

export async function deletePayment(orgId: string, paymentId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_delete_payment", { p_payment_id: paymentId });
  if (error) return { error: error.message };

  revalidatePath(`/admin/${orgId}`);
  revalidatePath("/admin");
  return { success: true };
}

export async function addNote(orgId: string, body: string) {
  const text = body.trim();
  if (!text || text.length > 2000) return { error: "La nota debe tener entre 1 y 2000 caracteres" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("admin_notes").insert({ organization_id: orgId, author_id: user?.id, body: text });
  if (error) return { error: error.message };

  revalidatePath(`/admin/${orgId}`);
  return { success: true };
}
