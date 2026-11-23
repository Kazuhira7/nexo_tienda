"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { getOrgContext } from "@/lib/org-context";
import { localDateString, localDayRange } from "@/lib/dates";

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
const ClosureSchema = z.object({
  countedCash: z.number().finite().min(0, "El efectivo contado no puede ser negativo").max(10_000_000),
  notes:       z.string().trim().max(500).nullable(),
});

/**
 * Closes today's drawer. Only what the person counted comes from the client: the day, the
 * starting float and the expected amounts are recomputed here from the database, so a stale
 * screen (or a tampered request) can't save wrong figures.
 */
export async function saveCashClosure(input: z.input<typeof ClosureSchema>) {
  const parsed = ClosureSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const orgId = await getOrgId();
  const { timezone } = await getOrgContext();
  const { data: { user } } = await supabase.auth.getUser();

  const today = localDateString(timezone);
  const range = localDayRange(today, timezone);
  const [{ data: sales, error: salesError }, { data: opening }] = await Promise.all([
    supabase.from("sales").select("total, payment_method")
      .eq("cancelled", false).gte("created_at", range.start).lt("created_at", range.end),
    supabase.from("cash_openings").select("opening_cash").eq("opening_date", today).maybeSingle(),
  ]);
  if (salesError) return { error: salesError.message };

  const round = (n: number) => Math.round(n * 100) / 100;
  const sum = (m: string) => round((sales ?? []).filter((s) => s.payment_method === m).reduce((a, s) => a + s.total, 0));
  const openingCash = round(Number(opening?.opening_cash ?? 0));
  const expectedCash = round(openingCash + sum("cash")); // float + cash sales
  const countedCash = round(parsed.data.countedCash);

  const { error } = await supabase.from("cash_closures").upsert(
    {
      organization_id:   orgId,
      closure_date:      today,
      opening_cash:      openingCash,
      expected_cash:     expectedCash,
      counted_cash:      countedCash,
      expected_pos:      sum("pos"),
      expected_transfer: sum("transfer"),
      expected_mixed:    sum("mixed"),
      difference:        round(countedCash - expectedCash),
      notes:             parsed.data.notes || null,
      closed_by:         user?.id ?? null,
    },
    { onConflict: "organization_id,closure_date" }
  );

  if (error) return { error: error.message };
  revalidatePath("/caja");
  return { success: true };
}
