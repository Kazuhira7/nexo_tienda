"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";

interface SaveCashClosureInput {
  closureDate:      string; // YYYY-MM-DD
  expectedCash:     number;
  countedCash:      number;
  expectedPos:      number;
  expectedTransfer: number;
  expectedMixed:    number;
  notes:            string | null;
}

export async function saveCashClosure(input: SaveCashClosureInput) {
  const supabase = await createClient();
  const orgId = await getOrgId();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // difference = lo contado físico - lo esperado en efectivo
  const difference = Math.round((input.countedCash - input.expectedCash) * 100) / 100;

  const { error } = await supabase.from("cash_closures").upsert(
    {
      organization_id:   orgId,
      closure_date:      input.closureDate,
      expected_cash:     input.expectedCash,
      counted_cash:      input.countedCash,
      expected_pos:      input.expectedPos,
      expected_transfer: input.expectedTransfer,
      expected_mixed:    input.expectedMixed,
      difference,
      notes:             input.notes,
      closed_by:         user?.id ?? null,
    },
    { onConflict: "organization_id,closure_date" }
  );

  if (error) return { error: error.message };
  revalidatePath("/caja");
  return { success: true };
}
