"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";

export interface ImportRow {
  brand_name:     string;
  code:           string;
  name:           string;
  price:          number;
  cost?:          number;
  stock_quantity?: number;
  description?:   string;
}

export interface ImportResult {
  imported: number;
  skipped:  number;
  errors:   string[];
}

export async function importProducts(rows: ImportRow[]): Promise<ImportResult> {
  const supabase = await createClient();
  const orgId = await getOrgId();
  const result: ImportResult = { imported: 0, skipped: 0, errors: [] };

  const { data: existingBrands } = await supabase
    .from("brands")
    .select("id, name");

  const brandMap = new Map(existingBrands?.map((b) => [b.name.toLowerCase().trim(), b.id]) ?? []);

  for (const row of rows) {
    try {
      if (!row.brand_name?.trim() || !row.code?.trim() || !row.name?.trim()) {
        result.skipped++;
        continue;
      }

      const brandKey = row.brand_name.toLowerCase().trim();
      let brandId = brandMap.get(brandKey);

      if (!brandId) {
        const { data: newBrand, error } = await supabase
          .from("brands")
          .insert({ name: row.brand_name.trim(), organization_id: orgId })
          .select("id")
          .single();

        if (error || !newBrand) {
          result.errors.push(`Error creando marca "${row.brand_name}": ${error?.message}`);
          result.skipped++;
          continue;
        }
        brandId = newBrand.id;
        brandMap.set(brandKey, brandId);
      }

      const { error: productError } = await supabase
        .from("products")
        .upsert({
          organization_id:     orgId,
          brand_id:            brandId,
          code:                row.code.trim(),
          name:                row.name.trim(),
          price:               Math.max(0, row.price || 0),
          cost:                row.cost ? Math.max(0, row.cost) : null,
          stock_quantity:      Math.max(0, row.stock_quantity || 0),
          description:         row.description?.trim() || null,
          active:              true,
        }, { onConflict: "organization_id,code" });

      if (productError) {
        result.errors.push(`Error en "${row.code}": ${productError.message}`);
        result.skipped++;
      } else {
        result.imported++;
      }
    } catch {
      result.errors.push(`Error procesando fila con código "${row.code}"`);
      result.skipped++;
    }
  }

  revalidatePath("/inventario");
  revalidatePath("/marcas");
  return result;
}
