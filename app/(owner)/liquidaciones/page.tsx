import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import LiquidarButton from "@/components/liquidaciones/liquidar-button";
import MarkPaidButton from "@/components/liquidaciones/mark-paid-button";
import PeriodoSelector from "@/components/liquidaciones/periodo-selector";
import { getMoney } from "@/lib/get-currency";

function getCurrentPeriod() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const start = d <= 15 ? new Date(y, m, 1) : new Date(y, m, 16);
  const end = d <= 15
    ? new Date(y, m, 15, 23, 59, 59)
    : new Date(y, m + 1, 0, 23, 59, 59);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

interface Props {
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function LiquidacionesPage({ searchParams }: Props) {
  const fmt = await getMoney();
  const { from, to } = await searchParams;
  const supabase = await createClient();

  const defaultPeriod = getCurrentPeriod();
  const periodStart = from ?? defaultPeriod.start;
  const periodEnd = to ?? defaultPeriod.end;

  const startDt = new Date(periodStart + "T00:00:00");
  const endDt = new Date(periodEnd + "T23:59:59");

  const [{ data: brands }, { data: existingSettlements }, { data: periodItems }] =
    await Promise.all([
      supabase.from("brands").select("id, name, space_fee").eq("active", true).order("name"),
      supabase
        .from("settlements")
        .select("*")
        .eq("period_start", periodStart)
        .eq("period_end", periodEnd),
      supabase
        .from("sale_items")
        .select("brand_id, line_total, sales(created_at, cancelled)"),
    ]);

  const salesByBrand = (periodItems ?? [])
    .filter((i) => {
      const s = i.sales as { created_at: string; cancelled: boolean } | null;
      if (!s || s.cancelled) return false;
      const d = new Date(s.created_at);
      return d >= startDt && d <= endDt;
    })
    .reduce<Record<string, number>>((acc, i) => {
      acc[i.brand_id] = (acc[i.brand_id] ?? 0) + i.line_total;
      return acc;
    }, {});

  const settlementByBrand = Object.fromEntries(
    (existingSettlements ?? []).map((s) => [s.brand_id, s])
  );

  const periodoLabel = startDt.getDate() === 1
    ? `1–15 de ${startDt.toLocaleDateString("es-NI", { month: "long", year: "numeric" })}`
    : `16–${endDt.getDate()} de ${startDt.toLocaleDateString("es-NI", { month: "long", year: "numeric" })}`;

  const totalVendido = Object.values(salesByBrand).reduce((a, b) => a + b, 0);
  const paidCount = (brands ?? []).filter((b) => settlementByBrand[b.id]?.status === "paid").length;
  const totalBrands = brands?.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" >
            Liquidaciones
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {periodoLabel} · {fmt(totalVendido)} vendido
            {totalBrands > 0 && ` · ${paidCount}/${totalBrands} marcas pagadas`}
          </p>
        </div>
        <Suspense>
          <PeriodoSelector currentFrom={periodStart} currentTo={periodEnd} />
        </Suspense>
      </div>

      <div className="space-y-3">
        {(brands ?? []).length === 0 && (
          <p className="text-center text-muted-foreground py-10">
            No hay marcas activas.
          </p>
        )}
        {(brands ?? []).map((brand) => {
          const vendido = salesByBrand[brand.id] ?? 0;
          const settlement = settlementByBrand[brand.id];
          const isPaid = settlement?.status === "paid";
          const isLiquidated = !!settlement;

          return (
            <Card key={brand.id} className={isPaid ? "opacity-60" : ""}>
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{brand.name}</p>
                      {isPaid && (
                        <Badge className="bg-green-100 text-green-800 text-xs">Pagada</Badge>
                      )}
                      {isLiquidated && !isPaid && (
                        <Badge variant="outline" className="text-xs">Pendiente pago</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 mt-1 text-sm text-muted-foreground">
                      <span>
                        Ventas:{" "}
                        <strong className="text-foreground">{fmt(vendido)}</strong>
                      </span>
                      {brand.space_fee > 0 && (
                        <span>
                          Cuota:{" "}
                          <strong className="text-foreground">{fmt(brand.space_fee)}</strong>
                        </span>
                      )}
                      {vendido === 0 && (
                        <span className="text-muted-foreground italic">Sin ventas</span>
                      )}
                    </div>
                    {isPaid && settlement.paid_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Pagada el{" "}
                        {new Date(settlement.paid_at).toLocaleDateString("es-NI")}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/reporte/${brand.id}?from=${periodStart}&to=${periodEnd}`}
                    >
                      <Button variant="outline" size="sm">
                        Ver reporte
                      </Button>
                    </Link>
                    {!isLiquidated && (
                      <LiquidarButton
                        brandId={brand.id}
                        periodStart={periodStart}
                        periodEnd={periodEnd}
                        grossSales={vendido}
                        spaceFee={brand.space_fee}
                      />
                    )}
                    {isLiquidated && !isPaid && (
                      <MarkPaidButton settlementId={settlement.id} />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
