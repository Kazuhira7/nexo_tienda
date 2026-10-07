import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { requireModule } from "@/lib/require-module";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { orderLabel } from "@/lib/restaurant-report";
import { Badge } from "@/components/ui/badge";
import Ticket from "@/components/restaurante/ticket";
import { PrintTicketButton } from "@/components/restaurante/print-ticket";
import type { OrderItemModifier } from "@/types/database";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Owner view of a closed (or open) order: receipt + reprint, no staff PIN needed.
export default async function ReporteOrdenPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModule("restaurant");
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const { ticket } = await getOrgContext();
  const supabase = await createClient();
  const [{ data: order }, { data: items }, { data: payments }] = await Promise.all([
    supabase.from("orders")
      .select("id, order_number, order_type, status, customer_name, discount_total, cancel_reason, table:dining_tables(name), opened_by:staff_members!orders_opened_by_staff_fkey(name)")
      .eq("id", id).maybeSingle(),
    supabase.from("order_items")
      .select("id, item_name, quantity, line_total, modifiers")
      .eq("order_id", id).neq("status", "cancelled").order("created_at"),
    supabase.rpc("order_payments", { p_order_id: id }),
  ]);
  if (!order) notFound();

  const title = orderLabel({
    type:   order.order_type,
    table:  (order.table as { name: string } | null)?.name ?? null,
    name:   order.customer_name,
    number: order.order_number,
  });
  const waiter = (order.opened_by as { name: string } | null)?.name;

  return (
    <div className="space-y-4 max-w-md">
      <div className="flex items-center gap-3">
        <Link href="/reportes" aria-label="Volver a reportes"
          className="size-10 rounded-xl border flex items-center justify-center shrink-0 hover:bg-muted">
          <ArrowLeftIcon className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold truncate">Orden #{order.order_number}</h1>
          <p className="text-xs text-muted-foreground">{title}{waiter && ` · ${waiter}`}</p>
        </div>
        <Badge variant={order.status === "cancelled" ? "outline" : "secondary"}>
          {order.status === "paid" ? "Pagada" : order.status === "cancelled" ? "Cancelada" : "Abierta"}
        </Badge>
      </div>

      {order.status === "cancelled" && order.cancel_reason && (
        <p className="rounded-xl border bg-muted/40 px-4 py-3 text-sm">Motivo: {order.cancel_reason}</p>
      )}

      <Ticket
        kind={order.status === "paid" ? "recibo" : "precuenta"}
        business={ticket}
        title={title}
        number={order.order_number}
        items={(items ?? []).map((i) => ({
          ...i,
          line_total: Number(i.line_total),
          modifiers:  (i.modifiers ?? []) as OrderItemModifier[],
        }))}
        subtotal={(items ?? []).reduce((s, i) => s + Number(i.line_total), 0)}
        discount={Number(order.discount_total)}
        payments={(payments ?? []).map((p) => ({
          payment_method: p.payment_method,
          amount:         Number(p.amount),
          created_at:     p.created_at,
        }))}
      />
      {order.status === "paid" && <PrintTicketButton label="Reimprimir recibo" className="w-full h-11" />}
    </div>
  );
}
