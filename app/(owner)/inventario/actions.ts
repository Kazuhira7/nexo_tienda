"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { getOrgContext } from "@/lib/org-context";
import { z } from "zod";

const ProductSchema = z.object({
  brand_id:            z.union([z.string().uuid(), z.literal("")]).optional()
                         .transform((v) => v || null),
  code:                z.string().min(1, "El código es requerido"),
  name:                z.string().min(1, "El nombre es requerido"),
  description:         z.string().optional(),
  price:               z.coerce.number().min(0),
  cost:                z.coerce.number().min(0).optional(),
  stock_quantity:      z.coerce.number().int().min(0),
  low_stock_threshold: z.coerce.number().int().min(0),
});

// Collectives sell other people's products: every product belongs to a brand. Stores own their stock.
async function parseProduct(formData: FormData) {
  const parsed = ProductSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message } as const;
  const { modules } = await getOrgContext();
  if (modules.includes("brands") && !parsed.data.brand_id) return { error: "Elige la marca del producto" } as const;
  return { data: parsed.data } as const;
}

export async function createProduct(formData: FormData) {
  const parsed = await parseProduct(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const orgId = await getOrgId();

  const { error } = await supabase.from("products").insert({
    ...parsed.data,
    organization_id: orgId,
    description: parsed.data.description || null,
    cost:        parsed.data.cost ?? null,
  });

  if (error) return { error: error.message };
  revalidatePath("/inventario");
  return { success: true };
}

export async function updateProduct(id: string, formData: FormData) {
  const parsed = await parseProduct(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({
      ...parsed.data,
      description: parsed.data.description || null,
      cost:        parsed.data.cost ?? null,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/inventario");
  return { success: true };
}

export async function toggleProductActive(id: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("products").update({ active }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/inventario");
  return { success: true };
}
