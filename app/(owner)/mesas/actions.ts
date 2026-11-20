"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { z } from "zod";

// Writes go through RLS (owner of the org only). Table status is never edited
// here — it is driven by the order RPCs (open_order / close_order / …).

function done() {
  revalidatePath("/mesas");
  revalidatePath("/salon");
  return { success: true as const };
}

// ── Áreas ─────────────────────────────────────────────────────
const AreaSchema = z.object({
  name:       z.string().trim().min(1, "El nombre es requerido").max(40),
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
});

export async function saveArea(id: string | null, input: z.input<typeof AreaSchema>) {
  const parsed = AreaSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("dining_areas").update(parsed.data).eq("id", id)
    : await supabase.from("dining_areas").insert({ ...parsed.data, organization_id: await getOrgId() });
  if (error) return { error: error.message };
  return done();
}

export async function deleteArea(id: string) {
  const supabase = await createClient();
  // Tables of the area stay, without area (FK on delete set null)
  const { error } = await supabase.from("dining_areas").delete().eq("id", id);
  if (error) return { error: error.message };
  return done();
}

// ── Mesas ─────────────────────────────────────────────────────
const TableSchema = z.object({
  name:       z.string().trim().min(1, "El nombre es requerido").max(30),
  area_id:    z.string().uuid().nullable(),
  seats:      z.coerce.number().int().min(1, "Mínimo 1 puesto").max(50),
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
});

export async function saveTable(id: string | null, input: z.input<typeof TableSchema>) {
  const parsed = TableSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("dining_tables").update(parsed.data).eq("id", id)
    : await supabase.from("dining_tables").insert({ ...parsed.data, organization_id: await getOrgId() });
  if (error) return { error: error.message };
  return done();
}

// "Mesa 1" … "Mesa 10" in one go
const BulkSchema = z.object({
  area_id: z.string().uuid().nullable(),
  prefix:  z.string().trim().min(1, "Escribe el nombre base").max(20),
  from:    z.coerce.number().int().min(0).max(999),
  to:      z.coerce.number().int().min(0).max(999),
  seats:   z.coerce.number().int().min(1).max(50),
}).refine((v) => v.to >= v.from, { message: "El número final debe ser mayor o igual al inicial" })
  .refine((v) => v.to - v.from < 50, { message: "Máximo 50 mesas a la vez" });

export async function createTablesBulk(input: z.input<typeof BulkSchema>) {
  const parsed = BulkSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { area_id, prefix, from, to, seats } = parsed.data;

  const supabase = await createClient();
  const orgId = await getOrgId();
  const rows = Array.from({ length: to - from + 1 }, (_, i) => ({
    organization_id: orgId,
    area_id,
    name:            `${prefix} ${from + i}`,
    seats,
    sort_order:      from + i,
  }));
  const { error } = await supabase.from("dining_tables").insert(rows);
  if (error) return { error: error.message };
  return done();
}

export async function toggleTableActive(id: string, active: boolean) {
  const supabase = await createClient();
  if (!active) {
    const { data } = await supabase.from("dining_tables").select("status").eq("id", id).single();
    if (data && data.status !== "free") return { error: "La mesa tiene una orden abierta" };
  }
  const { error } = await supabase.from("dining_tables").update({ active }).eq("id", id);
  if (error) return { error: error.message };
  return done();
}

export async function deleteTable(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("dining_tables").select("status").eq("id", id).single();
  if (data && data.status !== "free") return { error: "La mesa tiene una orden abierta" };

  // If the table already has order history, keep it (deactivate) so reports by table survive
  const { count } = await supabase
    .from("orders").select("id", { count: "exact", head: true }).eq("table_id", id);
  if (count) return { error: "Esta mesa ya tiene historial de órdenes. Desactívala en lugar de eliminarla." };

  const { error } = await supabase.from("dining_tables").delete().eq("id", id);
  if (error) return { error: error.message };
  return done();
}
