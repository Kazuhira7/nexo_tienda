"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const Schema = z.object({
  delta: z.coerce.number().int().refine((n) => n !== 0, "Ingresa una cantidad distinta de 0"),
});

export async function adjustStock(productId: string, formData: FormData) {
  const parsed = Schema.safeParse({ delta: formData.get("delta") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();

  // Leer stock actual para evitar negativo
  const { data: product } = await supabase
    .from("products")
    .select("stock_quantity")
    .eq("id", productId)
    .single();

  if (!product) return { error: "Producto no encontrado" };

  const newQty = product.stock_quantity + parsed.data.delta;
  if (newQty < 0) return { error: "El stock no puede quedar negativo" };

  const { error } = await supabase
    .from("products")
    .update({ stock_quantity: newQty, updated_at: new Date().toISOString() })
    .eq("id", productId);

  if (error) return { error: error.message };
  revalidatePath("/inventario");
  return { success: true, newQty };
}
