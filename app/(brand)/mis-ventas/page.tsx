import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { getMoney } from "@/lib/get-currency";
import { getOrgContext } from "@/lib/org-context";
import { currentFortnight, localPeriodRange, periodLabel } from "@/lib/dates";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo", pos: "POS", transfer: "Transferencia", mixed: "Mixto",
};

export default async function MisVentasPage() {
  const fmt = await getMoney();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("brand_id")
    .eq("id", user!.id)
    .single();

  const brandId = profile?.brand_id;
  if (!brandId) return <p className="text-muted-foreground">Tu usuario no tiene una marca asignada. Pídele a la dueña que la revise.</p>;
  const { timezone } = await getOrgContext();
  const period = currentFortnight(timezone);
  const range = localPeriodRange(period.start, period.end, timezone);

  // This period's non-cancelled sales of the brand, in the business's local days
  const { data: periodItems } = await supabase
    .from("sale_items")
    .select(
      `id, quantity, unit_price, discount, line_total,
       products(code, name),
       sales!inner(sale_number, payment_method, created_at, cancelled)`
    )
    .eq("brand_id", brandId)
    .eq("sales.cancelled", false)
    .gte("sales.created_at", range.start)
    .lt("sales.created_at", range.end);

  const items = (periodItems ?? []).sort((a, b) =>
    (b.sales as { created_at: string }).created_at.localeCompare((a.sales as { created_at: string }).created_at));

  const totalPeriodo = items.reduce((s, i) => s + i.line_total, 0);
  const totalDesc    = items.reduce((s, i) => s + i.discount, 0);
  const totalCant    = items.reduce((s, i) => s + i.quantity, 0);

  const periodoLabel = periodLabel(period.start, period.end);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" >
          Mis ventas
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Periodo: {periodoLabel}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Total vendido",       value: `${fmt(totalPeriodo)}` },
          { label: "Artículos vendidos",  value: totalCant },
          { label: "Descuentos",          value: `${fmt(totalDesc)}` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#Venta</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Cant.</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Dto.</TableHead>
              <TableHead className="text-center hidden sm:table-cell">Pago</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                  Sin ventas en este periodo.
                </TableCell>
              </TableRow>
            )}
            {items.map((item) => {
              const sale    = item.sales as { sale_number: number; payment_method: string; created_at: string };
              const product = item.products as { code: string; name: string } | null;
              return (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-sm">
                    <div>
                      <span>#{sale.sale_number}</span>
                      <p className="text-xs text-muted-foreground">
                        {new Date(sale.created_at).toLocaleDateString("es-NI", { month: "short", day: "numeric", timeZone: timezone })}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{product?.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground font-mono">{product?.code}</p>
                  </TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{fmt(item.unit_price)}</TableCell>
                  <TableCell className="text-right hidden sm:table-cell text-muted-foreground">
                    {item.discount > 0 ? `−${fmt(item.discount)}` : "—"}
                  </TableCell>
                  <TableCell className="text-center hidden sm:table-cell">
                    <Badge variant="outline">{PAYMENT_LABELS[sale.payment_method] ?? sale.payment_method}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{fmt(item.line_total)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
