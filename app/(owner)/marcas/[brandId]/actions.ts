"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { z } from "zod";
import type { BrandPaymentType, PaymentMethod } from "@/types/database";

interface CreateBrandPaymentInput {
  brandId:    string;
  type:       BrandPaymentType;
  amount:     number;
  method:     PaymentMethod | null;
  occurredOn: string; // YYYY-MM-DD
  notes:      string | null;
}

const PaymentSchema = z.object({
  brandId:    z.string().uuid(),
  type:       z.enum(["payout", "fee_charge", "fee_payment"]),
  amount:     z.number().finite().positive("El monto debe ser mayor que cero.").max(100_000_000),
  method:     z.enum(["cash", "pos", "transfer", "mixed"]).nullable(),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  notes:      z.string().trim().max(500).nullable(),
});

export async function createBrandPayment(raw: CreateBrandPaymentInput) {
  const parsed = PaymentSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const input = parsed.data;

  const supabase = await createClient();
  const orgId = await getOrgId();
  // RLS limits brands to this business: a foreign brand id is simply not found
  const { data: brand } = await supabase.from("brands").select("id").eq("id", input.brandId).maybeSingle();
  if (!brand) return { error: "Marca no encontrada" };

  // method solo tiene sentido en movimientos de dinero (no en un cargo de cuota)
  const method = input.type === "fee_charge" ? null : input.method;

  const { error } = await supabase.from("brand_payments").insert({
    organization_id: orgId,
    brand_id:        input.brandId,
    type:            input.type,
    amount:          Math.round(input.amount * 100) / 100,
    method,
    occurred_on:     input.occurredOn,
    notes:           input.notes || null,
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
