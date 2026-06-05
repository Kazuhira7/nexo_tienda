import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import CancelSaleButton from "@/components/ventas/cancel-sale-button";
import VentasFiltros from "@/components/ventas/ventas-filtros";
import SaleDetail from "@/components/ventas/sale-detail";
import EmptyState from "@/components/empty-state";
import { getMoney } from "@/lib/get-currency";

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo", pos: "POS", transfer: "Transferencia", mixed: "Mixto",
};

interface Props {
  searchParams: Promise<{ desde?: string; hasta?: string; marca?: string; pago?: string }>;
}

export default async function VentasPage({ searchParams }: Props) {
  const fmt = await getMoney();
  const { desde, hasta, marca, pago } = await searchParams;
  const supabase = await createClient();

  const today = new Date();
  const defaultDesde = new Date(today);
  defaultDesde.setDate(today.getDate() - 30);

  const fechaDesde = desde ? `${desde}T00:00:00` : `${defaultDesde.toISOString().split("T")[0]}T00:00:00`;
  const fechaHasta = hasta ? `${hasta}T23:59:59` : `${today.toISOString().split("T")[0]}T23:59:59`;

  let q = supabase
    .from("sales")
    .select(`id, sale_number, total, subtotal, discount_total, payment_method,
       created_at, cancelled, cancelled_at,
       customers(name),
       sale_items(brand_id, quantity, unit_price, discount, line_total,
         brands(name), products(name, code))`)
    .gte("created_at", fechaDesde)
    .lte("created_at", fechaHasta)
    .order("created_at", { ascending: false })
    .limit(200);

  if (pago) q = q.eq("payment_method", pago as "cash" | "pos" | "transfer" | "mixed");
  const { data: sales } = await q;

  const filteredSales = marca
    ? sales?.filter((s) => (s.sale_items as { brand_id: string }[])?.some((i) => i.brand_id === marca))
    : sales;

  const { data: brands } = await supabase.from("brands").select("id, name").eq("active", true).order("name");

  const totalPeriodo = filteredSales?.filter((s) => !s.cancelled).reduce((sum, s) => sum + s.total, 0) ?? 0;
  const ventasActivas = filteredSales?.filter((s) => !s.cancelled).length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ventas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {ventasActivas} ventas · <span className="font-semibold text-foreground">{fmt(totalPeriodo)}</span> total
          </p>
        </div>
        <Link href="/ventas/nueva">
          <Button variant="cta">+ Nueva venta</Button>
        </Link>
      </div>

      <Suspense>
        <VentasFiltros brands={brands ?? []} />
      </Suspense>

      {!filteredSales?.length ? (
        <EmptyState
          icon="receipt"
          title="Sin ventas en este periodo"
          description="Ajusta los filtros o registra una nueva venta desde el punto de venta."
          action={<Link href="/ventas/nueva"><Button variant="cta">Ir al punto de venta</Button></Link>}
        />
      ) : (
        <>
          {/* Desktop — tabla */}
          <div className="hidden sm:block rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Marcas</TableHead>
                  <TableHead className="hidden md:table-cell">Cliente</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Descuento</TableHead>
                  <TableHead className="text-center">Pago</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => {
                  const isCancelled = sale.cancelled === true;
                  const saleMarks = [...new Set(
                    (sale.sale_items as { brands: { name: string } | null }[])
                      ?.map((si) => si.brands?.name).filter(Boolean)
                  )] as string[];

                  return (
                    <TableRow key={sale.id} className={isCancelled ? "opacity-50" : ""}>
                      <TableCell className="font-mono text-sm font-medium">#{sale.sale_number}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(sale.created_at).toLocaleString("es-NI", {
                          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {saleMarks.map((b) => <Badge key={b} variant="outline" className="text-xs">{b}</Badge>)}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {(sale.customers as { name: string } | null)?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell text-sm text-muted-foreground">
                        {sale.discount_total > 0 ? `−${fmt(sale.discount_total)}` : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={isCancelled ? "destructive" : "outline"}>
                          {isCancelled ? "Anulada" : PAYMENT_LABELS[sale.payment_method]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {isCancelled
                          ? <span className="line-through text-muted-foreground">{fmt(sale.total)}</span>
                          : `${fmt(sale.total)}`}
                      </TableCell>
                      <TableCell className="text-right">
                        {!isCancelled && <CancelSaleButton saleId={sale.id} saleNumber={sale.sale_number} />}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Móvil — cards expandibles con detalle */}
          <div className="sm:hidden space-y-2">
            {filteredSales.map((sale) => {
              const items = (sale.sale_items as {
                brand_id: string; quantity: number; unit_price: number;
                discount: number; line_total: number;
                brands: { name: string } | null;
                products: { name: string; code: string } | null;
              }[])?.map((si) => ({
                brand_name: si.brands?.name ?? "—",
                product_name: si.products?.name ?? "—",
                product_code: si.products?.code ?? "—",
                quantity: si.quantity,
                unit_price: si.unit_price,
                discount: si.discount,
                line_total: si.line_total,
              })) ?? [];

              return (
                <SaleDetail
                  key={sale.id}
                  saleNumber={sale.sale_number}
                  date={new Date(sale.created_at).toLocaleString("es-NI", {
                    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                  total={sale.total}
                  paymentMethod={sale.payment_method}
                  customerName={(sale.customers as { name: string } | null)?.name}
                  discountTotal={sale.discount_total}
                  isCancelled={sale.cancelled === true}
                  items={items}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
