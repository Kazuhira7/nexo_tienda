import { requireModule } from "@/lib/require-module";
import { getOrgContext } from "@/lib/org-context";
import { createClient } from "@/lib/supabase/server";
import SalonBoard, { type SalonOrder, type SalonTable } from "@/components/restaurante/salon/salon-board";
import RealtimeRefresh from "@/components/restaurante/realtime-refresh";

export default async function SalonPage() {
  await requireModule("restaurant");
  const { orgId } = await getOrgContext();
  const supabase = await createClient();

  const [{ data: areas }, { data: tables }, { data: orders }] = await Promise.all([
    supabase.from("dining_areas").select("id, name").order("sort_order").order("name"),
    supabase.from("dining_tables").select("id, name, seats, status, area_id")
      .eq("active", true).order("sort_order").order("name"),
    supabase.from("orders")
      .select("id, table_id, order_type, order_number, opened_at, guests, customer_name, opened_by:staff_members!orders_opened_by_staff_fkey(name)")
      .eq("status", "open").order("opened_at"),
  ]);

  const openOrders = orders ?? [];
  const { data: items } = openOrders.length
    ? await supabase.from("order_items").select("order_id, line_total, status")
        .in("order_id", openOrders.map((o) => o.id)).neq("status", "cancelled")
    : { data: [] as { order_id: string; line_total: number; status: string }[] };

  const summary: SalonOrder[] = openOrders.map((o) => {
    const own = (items ?? []).filter((i) => i.order_id === o.id);
    return {
      id:        o.id,
      tableId:   o.table_id,
      type:      o.order_type,
      number:    o.order_number,
      openedAt:  o.opened_at,
      guests:    o.guests,
      name:      o.customer_name,
      waiter:    (o.opened_by as { name: string } | null)?.name ?? null,
      total:     own.reduce((sum, i) => sum + Number(i.line_total), 0),
      pending:   own.filter((i) => i.status === "pending").length,
    };
  });

  const salonTables: SalonTable[] = (tables ?? []).map((t) => ({
    ...t,
    order: summary.find((o) => o.tableId === t.id) ?? null,
  }));

  return (
    <>
      {orgId && <RealtimeRefresh orgId={orgId} tables={["orders", "order_items", "dining_tables"]} />}
      <SalonBoard
        areas={areas ?? []}
        tables={salonTables}
        takeaways={summary.filter((o) => o.type !== "dine_in")}
      />
    </>
  );
}
