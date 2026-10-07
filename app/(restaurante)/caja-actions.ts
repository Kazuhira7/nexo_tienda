"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { withStaff, type StaffActionResult } from "@/lib/staff-session";

// Open today's cash drawer from the floor (restaurant): needs payments.collect,
// or a supervisor PIN. The owner can also open/correct it from /caja.
const Schema = z.object({
  amount: z.number().finite().min(0).max(10_000_000),
  notes:  z.string().trim().max(200),
});

export async function openCashFromFloor(amount: number, notes: string, authPin?: string): Promise<StaffActionResult<null>> {
  const parsed = Schema.safeParse({ amount, notes });
  if (!parsed.success) return { ok: false, error: "Monto inválido" };
  const result = await withStaff<null>(authPin, (t, s) =>
    s.rpc("open_cash", { p_staff_token: t, p_amount: parsed.data.amount, p_notes: parsed.data.notes || null })
  );
  if (result.ok) refresh();
  return result;
}
