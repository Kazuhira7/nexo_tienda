// Restaurant report (restaurant_report RPC, docs/db/011_reportes.sql) — server-only helper.
// Dates are local calendar days in the org's timezone (YYYY-MM-DD).
import { createClient } from "@/lib/supabase/server";
import type { OrderStatus, OrderType, PaymentMethod } from "@/types/database";

export interface RestaurantReport {
  timezone: string;
  totals: {
    sales:     number;
    discounts: number;
    payments:  number;
    orders:    number;
    guests:    number;
    takeaway:  number;
  };
  by_day:      { day: string; total: number; orders: number }[];
  by_hour:     { hour: number; total: number; orders: number }[];
  by_method:   { method: PaymentMethod; total: number; count: number }[];
  top_items:   { name: string; qty: number; revenue: number }[];
  by_category: { name: string; qty: number; revenue: number }[];
  by_waiter:   { name: string; orders: number; total: number }[];
  cancelled_orders: {
    id: string; number: number; table: string | null; name: string | null;
    reason: string | null; by: string | null; at: string; value: number;
  }[];
  voided_items: { name: string; qty: number; value: number; number: number; by: string | null; at: string }[];
  orders: {
    id: string; number: number; status: OrderStatus; type: OrderType;
    table: string | null; name: string | null; waiter: string | null; closed_at: string; total: number;
  }[];
}

export async function getRestaurantReport(
  from: string, to: string
): Promise<{ report: RestaurantReport | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("restaurant_report", { p_from: from, p_to: to });
  if (error) return { report: null, error: error.message };
  return { report: data as unknown as RestaurantReport, error: null };
}

/** Label for an order: table name, takeaway customer, or number. */
export function orderLabel(o: { type: OrderType; table: string | null; name: string | null; number: number }): string {
  if (o.type === "dine_in") return o.table ?? `Orden #${o.number}`;
  return o.name ? `Para llevar — ${o.name}` : `Para llevar #${o.number}`;
}
