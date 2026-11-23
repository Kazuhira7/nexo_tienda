import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getOrgContext } from "@/lib/org-context";
import { currentFortnight, localPeriodRange, periodLabel } from "@/lib/dates";

type PeriodItem = {
  brand_id: string | null;
  line_total: number;
  quantity: number;
  product_id: string;
  products: { name: string } | null;
};

interface Props {
  fmt: (amount: number) => string;
  showBrands?: boolean; // false = org without the brands module (e.g. retail)
}

export default async function PeriodReport({ fmt, showBrands = true }: Props) {
  const supabase = await createClient();
  const { timezone } = await getOrgContext();
  const period = currentFortnight(timezone);
  const range = localPeriodRange(period.start, period.end, timezone);

  const [{ data: brands }, { data: periodSalesData }, { data: allActiveProducts }] =
    await Promise.all([
      showBrands
        ? supabase.from("brands").select("id, name, space_fee").eq("active", true).order("name")
        : Promise.resolve({ data: [] as { id: string; name: string; space_fee: number }[] }),
      supabase
        .from("sales")
        .select("sale_items(brand_id, line_total, quantity, product_id, products(name))")
        .gte("created_at", range.start)
        .lt("created_at", range.end)
        .eq("cancelled", false),
      supabase
        .from("products")
        .select("id, name, brands(name)")
        .eq("active", true)
        .gt("stock_quantity", 0),
    ]);

  const periodItems = (periodSalesData ?? []).flatMap(
    (s) => (s.sale_items as PeriodItem[]) ?? []
  );

  const salesByBrand = periodItems.reduce<Record<string, number>>((acc, item) => {
    if (item.brand_id) acc[item.brand_id] = (acc[item.brand_id] ?? 0) + item.line_total;
    return acc;
  }, {});

  const salesByProduct = periodItems.reduce<
    Record<string, { name: string; qty: number; total: number }>
  >((acc, item) => {
    const name = item.products?.name ?? "—";
    if (!acc[item.product_id]) acc[item.product_id] = { name, qty: 0, total: 0 };
    acc[item.product_id].qty += item.quantity;
    acc[item.product_id].total += item.line_total;
    return acc;
  }, {});

  const topProducts = Object.values(salesByProduct)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const soldProductIds = new Set(Object.keys(salesByProduct));
  const noRotation = (allActiveProducts ?? [])
    .filter((p) => !soldProductIds.has(p.id))
    .slice(0, 5);

  const totalPeriodo = periodItems.reduce((sum, i) => sum + i.line_total, 0);
  const periodoLabel = periodLabel(period.start, period.end);

  return (
    <div className="space-y-4">
      {showBrands && (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Reporte quincenal — {periodoLabel}</CardTitle>
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
                        Cuota: {fmt(brand.space_fee)}
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
      )}

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
    </div>
  );
}
