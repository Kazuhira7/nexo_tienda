"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { withStaff, type StaffActionResult } from "@/lib/staff-session";

// Payments go through pay_order (payments.collect): each call = one row in sales.
// The order closes and the table frees when the balance reaches 0.

const uuid = z.string().uuid();
const money = z.number().finite().min(0).max(10_000_000);

export async function applyDiscount(orderId: string, amount: number, authPin?: string): Promise<StaffActionResult<null>> {
  if (!uuid.safeParse(orderId).success || !money.safeParse(amount).success) {
    return { ok: false, error: "Descuento inválido" };
  }
  const result = await withStaff<null>(authPin, (t, s) =>
    s.rpc("set_order_discount", { p_staff_token: t, p_order_id: orderId, p_amount: amount })
  );
  if (result.ok) refresh();
  return result;
}

const MethodSchema = z.enum(["cash", "pos", "transfer"]);

/** Returns the remaining balance (0 = order paid, table freed). */
export async function payOrder(
  orderId: string, amount: number, method: string, authPin?: string
): Promise<StaffActionResult<number>> {
  const m = MethodSchema.safeParse(method);
  if (!uuid.safeParse(orderId).success || !money.safeParse(amount).success || !m.success) {
    return { ok: false, error: "Datos de pago inválidos" };
  }
  const result = await withStaff<number>(authPin, (t, s) =>
    s.rpc("pay_order", { p_staff_token: t, p_order_id: orderId, p_amount: amount, p_payment_method: m.data })
  );
  if (result.ok) refresh();
  return result.ok ? { ok: true, data: Number(result.data) } : result;
}
