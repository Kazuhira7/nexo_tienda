import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUpIcon, StoreIcon, PackageIcon } from "lucide-react";
import { getMoney } from "@/lib/get-currency";

function getPeriodRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  const start = day <= 15 ? new Date(year, month, 1) : new Date(year, month, 16);
  const end = day <= 15
    ? new Date(year, month, 15, 23, 59, 59)
    : new Date(year, month + 1, 0, 23, 59, 59);
  return { start, end };
}

export default async function OwnerDashboard() {
  const fmt = await getMoney();
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];
  const { start, end } = getPeriodRange();

  const [
    { count: brandsCount },
    { count: productsCount },
    { data: todaySales },
    { data: brands },
    { data: lowStockProducts },
    { data: allActiveProducts },
  ] = await Promise.all([
    supabase.from("brands").select("*", { count: "exact", head: true }).eq("active", true),
    supabase.from("products").select("*", { count: "exact", head: true }).eq("active", true),
    supabase
      .from("sales")
      .select("total")
      .gte("created_at", `${today}T00:00:00`)
      .lte("created_at", `${today}T23:59:59`),
    supabase.from("brands").select("id, name, space_fee").eq("active", true).order("name"),
    supabase
      .from("products")
      .select("id, name, stock_quantity, low_stock_threshold, brands(name)")
      .eq("active", true)
      .filter("stock_quantity", "lte", "low_stock_threshold")
      .limit(5),
    supabase
      .from("products")
      .select("id, name, brands(name)")
      .eq("active", true)
      .gt("stock_quantity", 0),
  ]);

  const totalHoy = todaySales?.reduce((sum, s) => sum + s.total, 0) ?? 0;

  // Ventas por marca en el periodo actual
  const { data: rawPeriodItems } = await supabase
    .from("sale_items")
    .select("brand_id, line_total, quantity, product_id, products(name), sales(created_at, cancelled)");

  const periodItems = (rawPeriodItems ?? []).filter((i) => {
    const s = i.sales as { created_at: string; cancelled: boolean } | null;
    if (!s || s.cancelled) return false;
    const d = new Date(s.created_at);
    return d >= start && d <= end;
  });

  const salesByBrand = (periodItems ?? []).reduce<Record<string, number>>((acc, item) => {
    acc[item.brand_id] = (acc[item.brand_id] ?? 0) + item.line_total;
    return acc;
  }, {});

  // Top 5 productos más vendidos del periodo
  const salesByProduct = (periodItems ?? []).reduce<
    Record<string, { name: string; qty: number; total: number }>
  >((acc, item) => {
    const name = (item.products as { name: string } | null)?.name ?? "—";
    if (!acc[item.product_id]) acc[item.product_id] = { name, qty: 0, total: 0 };
    acc[item.product_id].qty += item.quantity;
    acc[item.product_id].total += item.line_total;
    return acc;
  }, {});

  const topProducts = Object.values(salesByProduct)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // Productos sin rotación: activos con stock, sin ventas en el periodo
  const soldProductIds = new Set(Object.keys(salesByProduct));
  const noRotation = (allActiveProducts ?? [])
    .filter((p) => !soldProductIds.has(p.id))
    .slice(0, 5);

  const periodoLabel = start.getDate() === 1
    ? `1–15 de ${start.toLocaleDateString("es-NI", { month: "long", year: "numeric" })}`
    : `16–${end.getDate()} de ${start.toLocaleDateString("es-NI", { month: "long", year: "numeric" })}`;

  const totalPeriodo = Object.values(salesByBrand).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" >
            Panel principal
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {new Date().toLocaleDateString("es-NI", {
              weekday: "long", year: "numeric", month: "long", day: "numeric",
            })}
          </p>
        </div>
        <Link href="/ventas/nueva">
          <Button variant="cta">
            + Nueva venta
          </Button>
        </Link>
      </div>

      {/* KPIs del día */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingUpIcon className="size-4 text-primary" />
              Ventas hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmt(totalHoy)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <StoreIcon className="size-4 text-primary" />
              Marcas activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{brandsCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <PackageIcon className="size-4 text-primary" />
              Productos activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{productsCount ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Reporte quincenal por marca */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Reporte quincenal — {periodoLabel}
            </CardTitle>
            <Badge variant="outline">{fmt(totalPeriodo)} total</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {(brands ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground px-4 py-6 text-center">
                Sin marcas registradas.
              </p>
            )}
            {(brands ?? []).map((brand) => {
              const vendido = salesByBrand[brand.id] ?? 0;
              return (
                <div key={brand.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-medium text-sm">{brand.name}</p>
                    {brand.space_fee > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Cuota: C${brand.space_fee.toFixed(2)}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{fmt(vendido)}</p>
                    {vendido === 0 && (
                      <p className="text-xs text-muted-foreground">Sin ventas</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top productos del periodo */}
      {topProducts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Top productos — {periodoLabel}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-muted-foreground w-5">{i + 1}</span>
                    <p className="text-sm font-medium">{p.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{fmt(p.total)}</p>
                    <p className="text-xs text-muted-foreground">{p.qty} uds.</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Productos sin rotación */}
      {noRotation.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <span>⚠</span> Sin ventas este periodo — {periodoLabel}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {noRotation.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(p.brands as { name: string } | null)?.name}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                    Sin ventas
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alertas de stock bajo */}
      {(lowStockProducts?.length ?? 0) > 0 && (
        <Card className="border-destructive/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-destructive">
              Alertas de stock bajo
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {lowStockProducts!.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-2">
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(p.brands as { name: string } | null)?.name}
                    </p>
                  </div>
                  <Badge variant="destructive">
                    {p.stock_quantity} uds.
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
