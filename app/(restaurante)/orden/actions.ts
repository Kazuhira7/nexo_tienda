"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withStaff, type StaffActionResult } from "@/lib/staff-session";
import type { OrderItemStatus } from "@/types/database";

// Every order mutation goes through a Postgres RPC that validates the staff PIN
// session and permission (require_staff). Prices always come from the DB.
// `authPin` = supervisor override when the current staff member lacks a permission.

const uuid = z.string().uuid();
const invalid = <T>(): StaffActionResult<T> => ({ ok: false, error: "Datos inválidos" });

async function after<T>(result: StaffActionResult<T>): Promise<StaffActionResult<T>> {
  if (result.ok) refresh();
  return result;
}

// ── Abrir ─────────────────────────────────────────────────────

export async function openTable(tableId: string): Promise<StaffActionResult<string>> {
  if (!uuid.safeParse(tableId).success) return invalid();
  const result = await withStaff<string>(undefined, (t, s) =>
    s.rpc("open_order", { p_staff_token: t, p_table_id: tableId, p_order_type: "dine_in" })
  );
  if (!result.ok && result.error.includes("ya tiene una orden abierta")) {
    // Another device opened it a moment ago: go to that order instead
    const supabase = await createClient();
    const { data } = await supabase
      .from("orders").select("id").eq("table_id", tableId).eq("status", "open").maybeSingle();
    if (data) return { ok: true, data: data.id };
  }
  return result;
}

export async function openTakeaway(customerName: string): Promise<StaffActionResult<string>> {
  const name = z.string().trim().max(60).safeParse(customerName);
  if (!name.success) return { ok: false, error: "Nombre muy largo" };
  return withStaff<string>(undefined, (t, s) =>
    s.rpc("open_order", {
      p_staff_token: t, p_order_type: "takeaway", p_customer_name: name.data || null,
    })
  );
}

// ── Platillos ─────────────────────────────────────────────────

const AddItemSchema = z.object({
  orderId:     uuid,
  menuItemId:  uuid,
  quantity:    z.number().int().min(1).max(99),
  modifierIds: z.array(uuid).max(20),
  notes:       z.string().trim().max(140).optional(),
});

export async function addItem(input: z.input<typeof AddItemSchema>): Promise<StaffActionResult<string>> {
  const parsed = AddItemSchema.safeParse(input);
  if (!parsed.success) return invalid();
  const { orderId, menuItemId, quantity, modifierIds, notes } = parsed.data;
  return after(await withStaff<string>(undefined, (t, s) =>
    s.rpc("add_order_item", {
      p_staff_token: t, p_order_id: orderId, p_menu_item_id: menuItemId,
      p_quantity: quantity, p_modifier_ids: modifierIds, p_notes: notes || null,
    })
  ));
}

export async function updateItem(itemId: string, quantity: number, notes: string | null): Promise<StaffActionResult<null>> {
  if (!uuid.safeParse(itemId).success || !Number.isInteger(quantity)) return invalid();
  return after(await withStaff<null>(undefined, (t, s) =>
    s.rpc("update_order_item", { p_staff_token: t, p_item_id: itemId, p_quantity: quantity, p_notes: notes })
  ));
}

async function setItemStatus(itemId: string, status: OrderItemStatus, authPin?: string) {
  if (!uuid.safeParse(itemId).success) return invalid<null>();
  return after(await withStaff<null>(authPin, (t, s) =>
    s.rpc("set_order_item_status", { p_staff_token: t, p_item_id: itemId, p_status: status })
  ));
}

/** Pending item: just remove it. Already sent: requires orders.void_item (or a supervisor PIN). */
export async function voidItem(itemId: string, authPin?: string) {
  return setItemStatus(itemId, "cancelled", authPin);
}

export async function serveItem(itemId: string) {
  return setItemStatus(itemId, "served");
}

// ── Orden ─────────────────────────────────────────────────────

export async function sendToKitchen(orderId: string): Promise<StaffActionResult<number>> {
  if (!uuid.safeParse(orderId).success) return invalid();
  return after(await withStaff<number>(undefined, (t, s) =>
    s.rpc("send_order_to_kitchen", { p_staff_token: t, p_order_id: orderId })
  ));
}

export async function requestBill(orderId: string): Promise<StaffActionResult<null>> {
  if (!uuid.safeParse(orderId).success) return invalid();
  return after(await withStaff<null>(undefined, (t, s) =>
    s.rpc("request_bill", { p_staff_token: t, p_order_id: orderId })
  ));
}

export async function setGuests(orderId: string, guests: number): Promise<StaffActionResult<null>> {
  if (!uuid.safeParse(orderId).success || !Number.isInteger(guests)) return invalid();
  return after(await withStaff<null>(undefined, (t, s) =>
    s.rpc("set_order_guests", { p_staff_token: t, p_order_id: orderId, p_guests: guests })
  ));
}

export async function cancelOrder(orderId: string, reason: string, authPin?: string): Promise<StaffActionResult<null>> {
  if (!uuid.safeParse(orderId).success) return invalid();
  return withStaff<null>(authPin, (t, s) =>
    s.rpc("cancel_order", { p_staff_token: t, p_order_id: orderId, p_reason: reason })
  );
}
