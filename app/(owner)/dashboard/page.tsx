import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUpIcon, StoreIcon, PackageIcon } from "lucide-react";
import { getMoney } from "@/lib/get-currency";
import { getOrgContext } from "@/lib/org-context";
import { hasModule } from "@/lib/modules";
import { localDateString, localDayRange } from "@/lib/dates";
import PeriodReport from "@/components/dashboard/period-report";
import RestaurantDashboard from "@/components/restaurante/dashboard/restaurant-dashboard";

export default async function OwnerDashboard() {
  const { modules, timezone } = await getOrgContext();
  if (hasModule(modules, "restaurant")) return <RestaurantDashboard />;

  const fmt = await getMoney();
  const showBrands = hasModule(modules, "brands");
  const supabase = await createClient();
  const todayRange = localDayRange(localDateString(timezone), timezone);

  const [
    { count: brandsCount },
    { count: productsCount },
    { data: todaySales },
    { data: activeProductsStock },
  ] = await Promise.all([
    supabase.from("brands").select("*", { count: "exact", head: true }).eq("active", true),
    supabase.from("products").select("*", { count: "exact", head: true }).eq("active", true),
    supabase
      .from("sales")
      .select("total")
      .gte("created_at", todayRange.start)
      .lt("created_at", todayRange.end)
      .eq("cancelled", false),
    supabase
      .from("products")
      .select("id, name, stock_quantity, low_stock_threshold, brands(name)")
      .eq("active", true),
  ]);

  const totalHoy = todaySales?.reduce((sum, s) => sum + s.total, 0) ?? 0;

  // PostgREST can't compare two columns in a filter (22P02) — do it in JS
  const lowStockProducts = (activeProductsStock ?? [])
    .filter((p) => p.stock_quantity <= p.low_stock_threshold)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Panel principal</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {new Date().toLocaleDateString("es-NI", {
              weekday: "long", year: "numeric", month: "long", day: "numeric",
            })}
          </p>
        </div>
        <Link href="/ventas/nueva">
          <Button variant="cta">+ Nueva venta</Button>
        </Link>
      </div>

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
        {showBrands && (
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
        )}
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

      {/* Alertas de stock bajo */}
      {lowStockProducts.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-destructive">Alertas de stock bajo</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {lowStockProducts.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-2">
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(p.brands as { name: string } | null)?.name}
                    </p>
                  </div>
                  <Badge variant="destructive">{p.stock_quantity} uds.</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Suspense fallback={<PeriodSkeleton />}>
        <PeriodReport fmt={fmt} showBrands={showBrands} />
      </Suspense>
    </div>
  );
}

function PeriodSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="rounded-xl border bg-card">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="h-5 w-52 bg-muted rounded" />
          <div className="h-6 w-24 bg-muted rounded-full" />
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex justify-between px-4 py-3 border-b last:border-0">
            <div className="space-y-1.5">
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-3 w-20 bg-muted rounded" />
            </div>
            <div className="h-5 w-20 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
