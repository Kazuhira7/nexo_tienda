"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { z } from "zod";

// Owner-only writes through RLS. Prices are stored in NIO.
// Staff toggle "Agotado" during service through the set_menu_item_available RPC (PIN).

function done() {
  revalidatePath("/menu");
  revalidatePath("/salon");
  return { success: true as const };
}

// ── Categorías ────────────────────────────────────────────────
const CategorySchema = z.object({
  name:       z.string().trim().min(1, "El nombre es requerido").max(40),
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
});

export async function saveCategory(id: string | null, input: z.input<typeof CategorySchema>) {
  const parsed = CategorySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("menu_categories").update(parsed.data).eq("id", id)
    : await supabase.from("menu_categories").insert({ ...parsed.data, organization_id: await getOrgId() });
  if (error) return { error: error.message };
  return done();
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();
  // Dishes stay, without category (FK on delete set null)
  const { error } = await supabase.from("menu_categories").delete().eq("id", id);
  if (error) return { error: error.message };
  return done();
}

// ── Platillos ─────────────────────────────────────────────────
const MenuItemSchema = z.object({
  name:         z.string().trim().min(1, "El nombre es requerido").max(80),
  category_id:  z.string().uuid().nullable(),
  price:        z.coerce.number().min(0, "Precio inválido").max(1_000_000),
  cost:         z.coerce.number().min(0).max(1_000_000).nullable(),
  description:  z.string().trim().max(200).nullable(),
  prep_station: z.enum(["kitchen", "bar"]),
  active:       z.boolean(),
  sort_order:   z.coerce.number().int().min(0).max(999).default(0),
  group_ids:    z.array(z.string().uuid()).max(20),
});

export async function saveMenuItem(id: string | null, input: z.input<typeof MenuItemSchema>) {
  const parsed = MenuItemSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { group_ids, ...item } = parsed.data;
  const row = { ...item, description: item.description || null };

  const supabase = await createClient();
  const orgId = await getOrgId();

  let itemId = id;
  if (id) {
    const { error } = await supabase.from("menu_items").update(row).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await supabase
      .from("menu_items").insert({ ...row, organization_id: orgId }).select("id").single();
    if (error) return { error: error.message };
    itemId = data.id;
  }

  // Sync which extras/options groups apply to this dish
  const { error: delError } = await supabase
    .from("menu_item_modifier_groups").delete().eq("menu_item_id", itemId!);
  if (delError) return { error: delError.message };
  if (group_ids.length) {
    const { error: insError } = await supabase.from("menu_item_modifier_groups").insert(
      group_ids.map((group_id, i) => ({
        menu_item_id: itemId!, group_id, organization_id: orgId, sort_order: i,
      }))
    );
    if (insError) return { error: insError.message };
  }

  return done();
}

export async function toggleMenuItemAvailable(id: string, available: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("menu_items").update({ available }).eq("id", id);
  if (error) return { error: error.message };
  return done();
}

export async function deleteMenuItem(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("menu_items").delete().eq("id", id);
  if (error) {
    return {
      error: error.code === "23503"
        ? "Este platillo ya se vendió. Desactívalo (Editar → Activo) en lugar de eliminarlo."
        : error.message,
    };
  }
  return done();
}

// ── Extras y opciones (grupos de modificadores) ───────────────
const ModifierGroupSchema = z.object({
  name:       z.string().trim().min(1, "El nombre es requerido").max(40),
  min_select: z.coerce.number().int().min(0).max(20),
  max_select: z.coerce.number().int().min(1, "Debe permitir al menos 1").max(20),
  options:    z.array(z.object({
    id:          z.string().uuid().optional(),
    name:        z.string().trim().min(1, "Cada opción necesita nombre").max(60),
    price_delta: z.coerce.number().min(-1_000_000).max(1_000_000),
  })).min(1, "Agrega al menos una opción").max(40),
}).refine((g) => g.max_select >= g.min_select, { message: "El máximo no puede ser menor que el mínimo" })
  .refine((g) => g.min_select <= g.options.length, { message: "El mínimo es mayor que la cantidad de opciones" });

export async function saveModifierGroup(id: string | null, input: z.input<typeof ModifierGroupSchema>) {
  const parsed = ModifierGroupSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { options, ...group } = parsed.data;

  const supabase = await createClient();
  const orgId = await getOrgId();

  let groupId = id;
  if (id) {
    const { error } = await supabase.from("modifier_groups").update(group).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await supabase
      .from("modifier_groups").insert({ ...group, organization_id: orgId }).select("id").single();
    if (error) return { error: error.message };
    groupId = data.id;
  }

  // Sync options. Orders keep a snapshot (order_items.modifiers), so removing an option is safe.
  const { data: existing } = await supabase.from("modifiers").select("id").eq("group_id", groupId!);
  const keep = new Set(options.filter((o) => o.id).map((o) => o.id!));
  const toDelete = (existing ?? []).map((m) => m.id).filter((mid) => !keep.has(mid));
  if (toDelete.length) {
    const { error } = await supabase.from("modifiers").delete().in("id", toDelete);
    if (error) return { error: error.message };
  }
  for (const [i, o] of options.entries()) {
    const row = { name: o.name, price_delta: o.price_delta, sort_order: i };
    const { error } = o.id
      ? await supabase.from("modifiers").update(row).eq("id", o.id).eq("group_id", groupId!)
      : await supabase.from("modifiers").insert({ ...row, group_id: groupId!, organization_id: orgId });
    if (error) return { error: error.message };
  }

  return done();
}

export async function deleteModifierGroup(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("modifier_groups").delete().eq("id", id);
  if (error) return { error: error.message };
  return done();
}
