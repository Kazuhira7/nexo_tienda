import { notFound } from "next/navigation";
import { requireModule } from "@/lib/require-module";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import CobrarScreen from "@/components/restaurante/cobrar/cobrar-screen";
import type { OrderItemModifier } from "@/types/database";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function CobrarPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModule("restaurant");
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const { ticket } = await getOrgContext();
  const supabase = await createClient();
  const [{ data: order }, { data: items }, { data: payments }] = await Promise.all([
    supabase.from("orders")
      .select("id, order_number, order_type, status, customer_name, discount_total, table:dining_tables(name)")
      .eq("id", id).maybeSingle(),
    supabase.from("order_items")
      .select("id, item_name, quantity, line_total, modifiers")
      .eq("order_id", id).neq("status", "cancelled").order("created_at"),
    supabase.rpc("order_payments", { p_order_id: id }),
  ]);
  if (!order) notFound();

  const tableName = (order.table as { name: string } | null)?.name;
  const title = order.order_type === "dine_in"
    ? tableName ?? "Mesa"
    : `Para llevar${order.customer_name ? ` — ${order.customer_name}` : ""}`;

  return (
    <CobrarScreen
      business={ticket}
      order={{
        id:       order.id,
        number:   order.order_number,
        title,
        status:   order.status,
        discount: Number(order.discount_total),
      }}
      items={(items ?? []).map((i) => ({
        ...i,
        line_total: Number(i.line_total),
        modifiers:  (i.modifiers ?? []) as OrderItemModifier[],
      }))}
      payments={(payments ?? []).map((p) => ({
        payment_method: p.payment_method,
        amount:         Number(p.amount),
        created_at:     p.created_at,
      }))}
    />
  );
}
