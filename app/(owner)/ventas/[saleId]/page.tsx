import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon } from "lucide-react";
import PrintButton from "@/components/reporte/print-button";
import { getMoney } from "@/lib/get-currency";
import { getOrgContext } from "@/lib/org-context";

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo", pos: "POS / Tarjeta", transfer: "Transferencia", mixed: "Mixto",
};

interface Props {
  params: Promise<{ saleId: string }>;
}

export default async function ReciboPage({ params }: Props) {
  const { saleId } = await params;
  const fmt = await getMoney();
  const { orgName } = await getOrgContext();
  const supabase = await createClient();

  const { data: sale } = await supabase
    .from("sales")
    .select(`*, customers(name),
      sale_items(quantity, unit_price, discount, line_total, products(name, code))`)
    .eq("id", saleId)
    .maybeSingle();

  if (!sale) notFound();

  const items = (sale.sale_items as {
    quantity: number; unit_price: number; discount: number; line_total: number;
    products: { name: string; code: string } | null;
  }[]) ?? [];

  const fecha = new Date(sale.created_at).toLocaleString("es-NI", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* Acciones — no se imprimen */}
      <div className="flex items-center justify-between print:hidden">
        <Link href="/ventas" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeftIcon className="size-4" /> Ventas
        </Link>
        <PrintButton />
      </div>

      {/* Recibo */}
      <div className="rounded-xl border bg-white text-neutral-900 p-6 print:border-0 print:p-0 print:rounded-none">
        <div className="text-center space-y-1 pb-4 border-b border-dashed">
          <p className="text-xl font-bold font-heading">{orgName}</p>
          <p className="text-xs text-neutral-500 uppercase tracking-widest">Recibo de venta</p>
          <p className="font-mono text-sm font-semibold">#{sale.sale_number}</p>
          <p className="text-xs text-neutral-500 capitalize">{fecha}</p>
          {sale.cancelled && (
            <p className="text-sm font-bold text-red-600 border border-red-300 rounded px-2 py-0.5 inline-block mt-1">
              VENTA ANULADA
            </p>
          )}
        </div>

        {/* Items */}
        <div className="py-4 space-y-2.5 border-b border-dashed">
          {items.map((item, i) => (
            <div key={i} className="flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium leading-tight">
                  {item.quantity}× {item.products?.name ?? "—"}
                </p>
                <p className="text-xs text-neutral-500 font-mono">
                  {item.products?.code}
                  {item.quantity > 1 && ` · ${fmt(item.unit_price)} c/u`}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold">{fmt(item.line_total)}</p>
                {item.discount > 0 && (
                  <p className="text-xs text-neutral-500">−{fmt(item.discount)} dto.</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Totales */}
        <div className="py-4 space-y-1.5 text-sm border-b border-dashed">
          <div className="flex justify-between text-neutral-600">
            <span>Subtotal</span>
            <span>{fmt(sale.subtotal)}</span>
          </div>
          {sale.discount_total > 0 && (
            <div className="flex justify-between text-neutral-600">
              <span>Descuento</span>
              <span>−{fmt(sale.discount_total)}</span>
            </div>
          )}
          <div className="flex justify-between items-baseline pt-1">
            <span className="font-semibold">TOTAL</span>
            <span className="text-2xl font-bold">{fmt(sale.total)}</span>
          </div>
          <div className="flex justify-between text-neutral-600 pt-1">
            <span>Pago</span>
            <span>{PAYMENT_LABELS[sale.payment_method]}</span>
          </div>
          {(sale.customers as { name: string } | null)?.name && (
            <div className="flex justify-between text-neutral-600">
              <span>Cliente</span>
              <span>{(sale.customers as { name: string }).name}</span>
            </div>
          )}
        </div>

        <p className="pt-4 text-center text-xs text-neutral-500">
          ¡Gracias por su compra!
        </p>
      </div>
    </div>
  );
}
