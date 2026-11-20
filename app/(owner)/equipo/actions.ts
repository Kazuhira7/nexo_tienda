"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { PERMISSION_IDS, type PermissionId } from "@/lib/permissions";
import { z } from "zod";

const StaffSchema = z.object({
  name:        z.string().trim().min(1, "El nombre es requerido").max(60),
  position:    z.string().trim().min(1, "El puesto es requerido").max(40),
  permissions: z.array(z.enum(PERMISSION_IDS as [PermissionId, ...PermissionId[]])),
  pin:         z.string().regex(/^\d{4}$/, "El PIN debe tener 4 dígitos").optional().or(z.literal("")),
  linkSelf:    z.boolean().optional(),
});

export type StaffInput = z.input<typeof StaffSchema>;

// Create or update a staff member; the PIN is hashed in Postgres (set_staff_pin),
// never stored or logged here. RLS restricts writes to the org owner.
export async function saveStaffMember(id: string | null, input: StaffInput) {
  const parsed = StaffSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, position, permissions, pin, linkSelf } = parsed.data;

  if (!id && !pin) return { error: "Asigna un PIN de 4 dígitos" };

  const supabase = await createClient();
  let memberId = id;

  if (id) {
    const { error } = await supabase
      .from("staff_members")
      .update({ name, position, permissions })
      .eq("id", id);
    if (error) return { error: error.message };
  } else {
    const orgId = await getOrgId();
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("staff_members")
      .insert({
        organization_id: orgId,
        name,
        position,
        permissions,
        profile_id:      linkSelf ? user?.id ?? null : null,
      })
      .select("id")
      .single();
    if (error) {
      return {
        error: error.code === "23505" ? "Ya estás en el equipo" : error.message,
      };
    }
    memberId = data.id;
  }

  if (pin && memberId) {
    const { error } = await supabase.rpc("set_staff_pin", { p_member_id: memberId, p_pin: pin });
    if (error) {
      // A new member without a valid PIN can't log in: roll the creation back
      if (!id) await supabase.from("staff_members").delete().eq("id", memberId);
      return { error: error.message };
    }
  }

  revalidatePath("/equipo");
  return { success: true };
}

export async function toggleStaffActive(id: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("staff_members").update({ active }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/equipo");
  return { success: true };
}
