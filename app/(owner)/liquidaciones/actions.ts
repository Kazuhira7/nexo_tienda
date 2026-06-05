"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";

export async function createSettlement(
  brandId:     string,
  periodStart: string,
  periodEnd:   string,
  grossSales:  number,
  spaceFee:    number
) {
  const supabase = await createClient();
  const orgId = await getOrgId();

  const { error } = await supabase.from("settlements").upsert(
    {
      organization_id:   orgId,
      brand_id:          brandId,
      period_start:      periodStart,
      period_end:        periodEnd,
      gross_sales:       grossSales,
      commission_amount: spaceFee,
      net_payout:        grossSales,
      status:            "pending",
    },
    { onConflict: "brand_id,period_start,period_end" }
  );

  if (error) return { error: error.message };
  revalidatePath("/liquidaciones");
  return { success: true };
}

export async function markSettlementPaid(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("settlements")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/liquidaciones");
  return { success: true };
}
