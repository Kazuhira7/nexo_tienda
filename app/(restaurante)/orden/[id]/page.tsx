import { notFound } from "next/navigation";
import { requireModule } from "@/lib/require-module";
import { getOrgContext } from "@/lib/org-context";
import { createClient } from "@/lib/supabase/server";
import OrderScreen, { type MenuData, type OrderView } from "@/components/restaurante/orden/order-screen";
import RealtimeRefresh from "@/components/restaurante/realtime-refresh";
import type { OrderItemModifier } from "@/types/database";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function OrdenPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModule("restaurant");
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const { orgId } = await getOrgContext();
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, order_type, status, guests, customer_name, opened_at, cancel_reason, table:dining_tables(name), opened_by:staff_members!orders_opened_by_staff_fkey(name)")
    .eq("id", id)
    .maybeSingle();
  if (!order) notFound();

  const [{ data: items }, { data: categories }, { data: menuItems }, { data: groups }, { data: modifiers }, { data: links }] =
    await Promise.all([
      supabase.from("order_items")
        .select("id, menu_item_id, item_name, quantity, unit_price, modifiers, modifiers_total, line_total, notes, status, created_at")
        .eq("order_id", id).order("created_at"),
      supabase.from("menu_categories").select("id, name").eq("active", true).order("sort_order").order("name"),
      supabase.from("menu_items").select("id, name, price, category_id, available")
        .eq("active", true).order("sort_order").order("name"),
      supabase.from("modifier_groups").select("id, name, min_select, max_select"),
      supabase.from("modifiers").select("id, group_id, name, price_delta").order("sort_order").order("name"),
      supabase.from("menu_item_modifier_groups").select("menu_item_id, group_id").order("sort_order"),
    ]);

  const menu: MenuData = {
    categories: categories ?? [],
    items: (menuItems ?? []).map((m) => ({
      ...m,
      price:    Number(m.price),
      groupIds: (links ?? []).filter((l) => l.menu_item_id === m.id).map((l) => l.group_id),
    })),
    groups: (groups ?? []).map((g) => ({
      ...g,
      options: (modifiers ?? [])
        .filter((m) => m.group_id === g.id)
        .map((m) => ({ id: m.id, name: m.name, price_delta: Number(m.price_delta) })),
    })),
  };

  const view: OrderView = {
    id:           order.id,
    number:       order.order_number,
    type:         order.order_type,
    status:       order.status,
    guests:       order.guests,
    customerName: order.customer_name,
    openedAt:     order.opened_at,
    cancelReason: order.cancel_reason,
    tableName:    (order.table as { name: string } | null)?.name ?? null,
    waiter:       (order.opened_by as { name: string } | null)?.name ?? null,
  };

  return (
    <>
      {orgId && <RealtimeRefresh orgId={orgId} tables={["order_items", "orders"]} />}
      <OrderScreen
        order={view}
        items={(items ?? []).map((i) => ({
          ...i,
          unit_price:      Number(i.unit_price),
          modifiers_total: Number(i.modifiers_total),
          line_total:      Number(i.line_total),
          modifiers:       (i.modifiers ?? []) as OrderItemModifier[],
        }))}
        menu={menu}
      />
    </>
  );
}
