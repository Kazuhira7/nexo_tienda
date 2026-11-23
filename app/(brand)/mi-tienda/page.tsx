import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getMoney } from "@/lib/get-currency";
import { getOrgContext } from "@/lib/org-context";
import { currentFortnight, localDateString, localDayRange, localPeriodRange, periodLabel } from "@/lib/dates";

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

  const brandId = profile?.brand_id;
  if (!brandId) return <p className="text-muted-foreground">Tu usuario no tiene una marca asignada. Pídele a la dueña que la revise.</p>;
  const brand = profile?.brands as { name: string; space_fee: number } | null;

  const { timezone } = await getOrgContext();
  const period = currentFortnight(timezone);
  const range = localPeriodRange(period.start, period.end, timezone);
  const today = localDayRange(localDateString(timezone), timezone);

  const [{ data: products }, { data: saleItems }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, stock_quantity, low_stock_threshold, active")
      .eq("brand_id", brandId)
      .eq("active", true),
    // This period's non-cancelled sales only, in the business's local days
    supabase
      .from("sale_items")
      .select("line_total, sales!inner(created_at)")
      .eq("brand_id", brandId)
      .eq("sales.cancelled", false)
      .gte("sales.created_at", range.start)
      .lt("sales.created_at", range.end),
  ]);

  const totalPeriodo = (saleItems ?? []).reduce((sum, i) => sum + i.line_total, 0);
  const totalHoy = (saleItems ?? [])
    .filter((i) => {
      const at = (i.sales as { created_at: string }).created_at;
      return at >= today.start && at < today.end;
    })
    .reduce((sum, i) => sum + i.line_total, 0);

  // Real per-product threshold — PostgREST can't compare columns, do it in JS
  const lowStock = (products ?? []).filter(
    (p) => p.stock_quantity <= p.low_stock_threshold
  );

  const periodoLabel = periodLabel(period.start, period.end);

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
