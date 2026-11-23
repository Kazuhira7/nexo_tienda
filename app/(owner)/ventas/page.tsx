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
import { getOrgContext } from "@/lib/org-context";
import { requireModule } from "@/lib/require-module";
import { isDayString, localDateString, localPeriodRange, shiftDay } from "@/lib/dates";

const PAGE_SIZE = 200;

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo", pos: "POS", transfer: "Transferencia", mixed: "Mixto",
};

interface Props {
  searchParams: Promise<{ desde?: string; hasta?: string; marca?: string; pago?: string }>;
}

export default async function VentasPage({ searchParams }: Props) {
  await requireModule("pos");
  const fmt = await getMoney();
  const { desde, hasta, marca, pago } = await searchParams;
  const supabase = await createClient();
  const { timezone, modules } = await getOrgContext();
  const useBrands = modules.includes("brands");

  // Days are the business's local days (the server runs in UTC)
  const today = localDateString(timezone);
  const range = localPeriodRange(
    isDayString(desde) ? desde : shiftDay(today, -30),
    isDayString(hasta) ? hasta : today,
    timezone,
  );
  const brandFilter = useBrands && marca ? marca : null;
  const payFilter = pago && ["cash", "pos", "transfer", "mixed"].includes(pago)
    ? (pago as "cash" | "pos" | "transfer" | "mixed") : null;

  // Totals over the whole period (the list below is capped)
  let totalsQ = supabase
    .from("sales")
    .select(brandFilter ? "total, sale_items!inner(brand_id)" : "total")
    .eq("cancelled", false)
    .gte("created_at", range.start)
    .lt("created_at", range.end);
  if (brandFilter) totalsQ = totalsQ.eq("sale_items.brand_id", brandFilter);
  if (payFilter) totalsQ = totalsQ.eq("payment_method", payFilter);

  let q = supabase
    .from("sales")
    .select(`id, sale_number, total, subtotal, discount_total, payment_method,
       created_at, cancelled, cancelled_at,
       customers(name),
       sale_items(brand_id, quantity, unit_price, discount, line_total,
         brands(name), products(name, code))`)
    .gte("created_at", range.start)
    .lt("created_at", range.end)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (payFilter) q = q.eq("payment_method", payFilter);
  const [{ data: sales }, { data: totals }, { data: brands }] = await Promise.all([
    q,
    totalsQ,
    useBrands
      ? supabase.from("brands").select("id, name").eq("active", true).order("name")
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const filteredSales = brandFilter
    ? sales?.filter((s) => (s.sale_items as { brand_id: string | null }[])?.some((i) => i.brand_id === brandFilter))
    : sales;

  const totalPeriodo = ((totals ?? []) as unknown as { total: number }[]).reduce((sum, s) => sum + s.total, 0);
  const ventasActivas = (totals ?? []).length;
  const capped = (sales?.length ?? 0) >= PAGE_SIZE;

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
      {capped && (
        <p className="text-xs text-muted-foreground">
          Se muestran las {PAGE_SIZE} ventas más recientes del periodo; los totales sí incluyen todas.
        </p>
      )}

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
                  <TableHead>{useBrands ? "Marcas" : "Productos"}</TableHead>
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
                  // Collectives: which brands sold. Stores: which products.
                  const saleMarks = [...new Set(
                    (sale.sale_items as { brands: { name: string } | null; products: { name: string } | null }[])
                      ?.map((si) => useBrands ? si.brands?.name : si.products?.name).filter(Boolean)
                  )] as string[];

                  return (
                    <TableRow key={sale.id} className={isCancelled ? "opacity-50" : ""}>
                      <TableCell className="font-mono text-sm font-medium">#{sale.sale_number}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(sale.created_at).toLocaleString("es-NI", {
                          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: timezone,
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
                        <div className="flex justify-end items-center gap-1">
                          <Link href={`/ventas/${sale.id}`}>
                            <Button variant="ghost" size="sm">Recibo</Button>
                          </Link>
                          {!isCancelled && <CancelSaleButton saleId={sale.id} saleNumber={sale.sale_number} />}
                        </div>
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
                brand_name: si.brands?.name ?? "",
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
                  saleId={sale.id}
                  saleNumber={sale.sale_number}
                  date={new Date(sale.created_at).toLocaleString("es-NI", {
                    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: timezone,
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
