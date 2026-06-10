"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import type { BrandPaymentType, PaymentMethod } from "@/types/database";

interface CreateBrandPaymentInput {
  brandId:    string;
  type:       BrandPaymentType;
  amount:     number;
  method:     PaymentMethod | null;
  occurredOn: string; // YYYY-MM-DD
  notes:      string | null;
}

export async function createBrandPayment(input: CreateBrandPaymentInput) {
  if (!(input.amount > 0)) return { error: "El monto debe ser mayor que cero." };

  const supabase = await createClient();
  const orgId = await getOrgId();

  // method solo tiene sentido en movimientos de dinero (no en un cargo de cuota)
  const method = input.type === "fee_charge" ? null : input.method;

  const { error } = await supabase.from("brand_payments").insert({
    organization_id: orgId,
    brand_id:        input.brandId,
    type:            input.type,
    amount:          input.amount,
    method,
    occurred_on:     input.occurredOn,
    notes:           input.notes,
  });

  if (error) return { error: error.message };
  revalidatePath(`/marcas/${input.brandId}`);
  revalidatePath("/marcas");
  return { success: true };
}

export async function deleteBrandPayment(id: string, brandId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("brand_payments").delete().eq("id", id);

  if (error) return { error: error.message };
  revalidatePath(`/marcas/${brandId}`);
  revalidatePath("/marcas");
  return { success: true };
}
