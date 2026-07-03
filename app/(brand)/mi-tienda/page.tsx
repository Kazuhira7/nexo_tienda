import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getMoney } from "@/lib/get-currency";

function getPeriodRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  const start = day <= 15
    ? new Date(year, month, 1)
    : new Date(year, month, 16);
  const end = day <= 15
    ? new Date(year, month, 15, 23, 59, 59)
    : new Date(year, month + 1, 0, 23, 59, 59);
  return { start, end };
}

export default async function BrandDashboard() {
  const fmt = await getMoney();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("brand_id, brands(name, space_fee)")
    .eq("id", user!.id)
    .single();

  const brandId = profile?.brand_id!;
  const brand = profile?.brands as { name: string; space_fee: number } | null;

  const { start, end } = getPeriodRange();

  const [{ data: products }, { data: saleItems }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, stock_quantity, low_stock_threshold, active")
      .eq("brand_id", brandId)
      .eq("active", true),
    supabase
      .from("sale_items")
      .select("line_total, sales(created_at, cancelled)")
      .eq("brand_id", brandId),
  ]);

  const todayStr = new Date().toISOString().split("T")[0];

  // Single fetch, two aggregations (exclude cancelled sales)
  const validItems = (saleItems ?? []).filter((i) => {
    const s = i.sales as { created_at: string; cancelled: boolean } | null;
    return s && !s.cancelled;
  });

  const totalPeriodo = validItems
    .filter((i) => {
      const d = new Date((i.sales as { created_at: string }).created_at);
      return d >= start && d <= end;
    })
    .reduce((sum, i) => sum + i.line_total, 0);

  const totalHoy = validItems
    .filter((i) => (i.sales as { created_at: string }).created_at.startsWith(todayStr))
    .reduce((sum, i) => sum + i.line_total, 0);

  // Real per-product threshold — PostgREST can't compare columns, do it in JS
  const lowStock = (products ?? []).filter(
    (p) => p.stock_quantity <= p.low_stock_threshold
  );

  const periodoLabel = start.getDate() === 1
    ? `1–15 de ${start.toLocaleDateString("es-NI", { month: "long" })}`
    : `16–${end.getDate()} de ${start.toLocaleDateString("es-NI", { month: "long" })}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" >
          {brand?.name ?? "Mi tienda"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Periodo actual: {periodoLabel}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Ventas hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{fmt(totalHoy)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Ventas del periodo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{fmt(totalPeriodo)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Productos activos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{products?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card className={lowStock.length > 0 ? "border-destructive" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Stock bajo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-xl font-bold ${lowStock.length > 0 ? "text-destructive" : ""}`}>
              {lowStock.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas de stock bajo — detalle */}
      {lowStock.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-destructive">
              Productos por agotarse
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {lowStock.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-2">
                  <p className="text-sm font-medium">{p.name}</p>
                  <Badge variant="destructive">{p.stock_quantity} uds.</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {brand?.space_fee ? (
        <Card className="bg-muted/40">
          <CardContent className="py-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Cuota por espacio este periodo
            </p>
            <p className="font-semibold">{fmt(brand.space_fee)}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex gap-3 flex-wrap">
        <Link href="/mi-cuenta">
          <Button variant="cta">Mi estado de cuenta</Button>
        </Link>
        <Link href="/mis-ventas">
          <Button variant="outline">Ver reporte quincenal</Button>
        </Link>
        <Link href="/mi-inventario">
          <Button variant="outline">Ver inventario</Button>
        </Link>
      </div>
    </div>
  );
}
