"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { getOrgContext } from "@/lib/org-context";
import { localDateString } from "@/lib/dates";

// ── Apertura ──────────────────────────────────────────────────
const OpeningSchema = z.object({
  openingCash: z.number().finite().min(0, "El fondo no puede ser negativo").max(10_000_000),
  notes:       z.string().trim().max(200).nullable(),
});

/** Opens (or corrects) today's cash drawer with its starting float. Owner only (RLS). */
export async function openCashDrawer(input: z.input<typeof OpeningSchema>) {
  const parsed = OpeningSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const orgId = await getOrgId();
  const { timezone } = await getOrgContext();
  const { data: { user } } = await supabase.auth.getUser();
  const today = localDateString(timezone); // the business's local day, not UTC

  const { error } = await supabase.from("cash_openings").upsert(
    {
      organization_id: orgId,
      opening_date:    today,
      opening_cash:    Math.round(parsed.data.openingCash * 100) / 100,
      notes:           parsed.data.notes || null,
      opened_by:       user?.id ?? null,
      updated_at:      new Date().toISOString(),
    },
    { onConflict: "organization_id,opening_date" }
  );

  if (error) return { error: error.message };
  revalidatePath("/caja");
  revalidatePath("/salon");
  return { success: true };
}

// ── Cierre ────────────────────────────────────────────────────
interface SaveCashClosureInput {
  closureDate:      string; // YYYY-MM-DD
  openingCash:      number; // fondo inicial del día
  cashSales:        number; // ventas en efectivo del día
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

  // Lo esperado en el cajón = fondo inicial + ventas en efectivo
  const expectedCash = Math.round((input.openingCash + input.cashSales) * 100) / 100;
  // difference = lo contado físico - lo esperado en efectivo
  const difference = Math.round((input.countedCash - expectedCash) * 100) / 100;

  const { error } = await supabase.from("cash_closures").upsert(
    {
      organization_id:   orgId,
      closure_date:      input.closureDate,
      opening_cash:      input.openingCash,
      expected_cash:     expectedCash,
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
