import { getOrgContext } from "@/lib/org-context";
import { createClient } from "@/lib/supabase/server";
import { orderLabel } from "@/lib/restaurant-report";
import { localDateString, localDayRange } from "@/lib/dates";
import PrintStation from "@/components/restaurante/estacion/print-station";
import RealtimeRefresh from "@/components/restaurante/realtime-refresh";
import type { KitchenTicketView } from "@/components/restaurante/estacion/kitchen-ticket";
import type { KitchenTicketItem, OrderType } from "@/types/database";


export default async function ImpresionPage() {
  const { orgId, timezone } = await getOrgContext();
  const supabase = await createClient();
  // Only today's tickets (local day): a station opened in the morning never prints last night's backlog
  const since = localDayRange(localDateString(timezone), timezone).start;

  const { data } = await supabase
    .from("kitchen_tickets")
    .select("id, ticket_number, round, items, created_at, printed_at, staff:staff_members(name), order:orders(order_number, order_type, customer_name, table:dining_tables(name))")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(80);

  const tickets: KitchenTicketView[] = (data ?? []).map((t) => {
    const order = t.order as {
      order_number: number; order_type: OrderType; customer_name: string | null; table: { name: string } | null;
    } | null;
    return {
      id:            t.id,
      ticket_number: t.ticket_number,
      round:         t.round,
      items:         t.items as KitchenTicketItem[],
      created_at:    t.created_at,
      printed_at:    t.printed_at,
      staff:         (t.staff as { name: string } | null)?.name ?? null,
      orderNumber:   order?.order_number ?? 0,
      title:         order
        ? orderLabel({ type: order.order_type, table: order.table?.name ?? null, name: order.customer_name, number: order.order_number })
        : "Orden",
    };
  });

  return (
    <>
      {orgId && <RealtimeRefresh orgId={orgId} tables={["kitchen_tickets"]} />}
      <PrintStation tickets={tickets} timezone={timezone} />
    </>
  );
}
