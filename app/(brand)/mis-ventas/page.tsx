import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { getMoney } from "@/lib/get-currency";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo", pos: "POS", transfer: "Transferencia", mixed: "Mixto",
};

function getPeriodRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const start = d <= 15 ? new Date(y, m, 1) : new Date(y, m, 16);
  const end   = d <= 15 ? new Date(y, m, 15, 23, 59, 59) : new Date(y, m + 1, 0, 23, 59, 59);
  return { start, end };
}

export default async function MisVentasPage() {
  const fmt = await getMoney();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("brand_id")
    .eq("id", user!.id)
    .single();

  const brandId = profile!.brand_id!;
  const { start, end } = getPeriodRange();

  // Fetch all sale_items for this brand and filter in JS to avoid PostgREST embedded filter issues
  const { data: allItems } = await supabase
    .from("sale_items")
    .select(
      `id, quantity, unit_price, discount, line_total,
       products(code, name),
       sales(sale_number, payment_method, created_at, cancelled)`
    )
    .eq("brand_id", brandId);

  // Filter by period and exclude cancelled sales
  const items = (allItems ?? [])
    .filter((item) => {
      const sale = item.sales as { created_at: string; cancelled: boolean } | null;
      if (!sale || sale.cancelled) return false;
      const date = new Date(sale.created_at);
      return date >= start && date <= end;
    })
    .sort((a, b) => {
      const da = new Date((a.sales as { created_at: string }).created_at).getTime();
      const db = new Date((b.sales as { created_at: string }).created_at).getTime();
      return db - da;
    });

  const totalPeriodo = items.reduce((s, i) => s + i.line_total, 0);
  const totalDesc    = items.reduce((s, i) => s + i.discount, 0);
  const totalCant    = items.reduce((s, i) => s + i.quantity, 0);

  const periodoLabel = start.getDate() === 1
    ? `1–15 de ${start.toLocaleDateString("es-NI", { month: "long", year: "numeric" })}`
    : `16–${end.getDate()} de ${start.toLocaleDateString("es-NI", { month: "long", year: "numeric" })}`;

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
                        {new Date(sale.created_at).toLocaleDateString("es-NI", { month: "short", day: "numeric" })}
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
