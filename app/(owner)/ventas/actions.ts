"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function cancelSale(saleId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_sale", { p_sale_id: saleId });
  if (error) return { error: error.message };
  revalidatePath("/ventas");
  return { success: true };
}
