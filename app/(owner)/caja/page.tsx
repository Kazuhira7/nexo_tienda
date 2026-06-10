import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BanknoteIcon, CreditCardIcon, ArrowLeftRightIcon } from "lucide-react";
import { getMoney } from "@/lib/get-currency";
import CashClosureForm from "@/components/caja/cash-closure-form";
import type { PaymentMethod } from "@/types/database";

export default async function CajaPage() {
  const fmt = await getMoney();
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const [{ data: todaySales }, { data: existing }, { data: history }] = await Promise.all([
    supabase
      .from("sales")
      .select("total, payment_method, cancelled")
      .gte("created_at", `${today}T00:00:00`)
      .lte("created_at", `${today}T23:59:59`),
    supabase.from("cash_closures").select("*").eq("closure_date", today).maybeSingle(),
    supabase
      .from("cash_closures")
      .select("*")
      .order("closure_date", { ascending: false })
      .limit(30),
  ]);

  // Esperado por método (excluye ventas anuladas)
  const valid = (todaySales ?? []).filter((s) => !s.cancelled);
  const sumBy = (m: PaymentMethod) =>
    valid.filter((s) => s.payment_method === m).reduce((acc, s) => acc + s.total, 0);

  const expectedCash     = sumBy("cash");
  const expectedPos      = sumBy("pos");
  const expectedTransfer = sumBy("transfer");
  const expectedMixed    = sumBy("mixed");
  const totalHoy = expectedCash + expectedPos + expectedTransfer + expectedMixed;

  const todayLabel = new Date().toLocaleDateString("es-NI", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const methodCards = [
    { label: "Efectivo",      value: expectedCash,     icon: BanknoteIcon,      note: "Se cuadra abajo" },
    { label: "POS / tarjeta", value: expectedPos,      icon: CreditCardIcon,    note: "Electrónico" },
    { label: "Transferencia", value: expectedTransfer, icon: ArrowLeftRightIcon, note: "Electrónico" },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Cierre de caja</h1>
        <p className="text-sm text-muted-foreground mt-0.5 capitalize">{todayLabel}</p>
      </div>

      {/* Esperado por método de pago */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            Esperado hoy según ventas
          </p>
          <Badge variant="outline">{fmt(totalHoy)} total</Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {methodCards.map(({ label, value, icon: Icon, note }) => (
            <Card key={label}>
              <CardHeader className="pb-1.5">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Icon className="size-4 text-primary" />
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold">{fmt(value)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{note}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Línea informativa: ventas mixtas */}
        {expectedMixed > 0 && (
          <div className="mt-3 rounded-xl border border-dashed bg-muted/30 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Ventas mixtas hoy</p>
              <p className="text-xs text-muted-foreground">
                Pagos combinados — concílialos a mano (no entran en el cuadre de efectivo).
              </p>
            </div>
            <p className="font-semibold">{fmt(expectedMixed)}</p>
          </div>
        )}
      </div>

      {/* Formulario de cuadre */}
      <CashClosureForm
        closureDate={today}
        expectedCash={expectedCash}
        expectedPos={expectedPos}
        expectedTransfer={expectedTransfer}
        expectedMixed={expectedMixed}
        existing={
          existing
            ? { counted_cash: existing.counted_cash, notes: existing.notes }
            : null
        }
      />

      {/* Historial de cierres */}
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
          Historial de cierres
        </p>
        {!history?.length ? (
          <div className="rounded-xl border bg-card px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">Aún no hay cierres registrados.</p>
          </div>
        ) : (
          <div className="rounded-xl border bg-card divide-y">
            {history.map((c) => {
              const cuadrado = c.difference === 0;
              const dateLabel = new Date(`${c.closure_date}T12:00:00`).toLocaleDateString("es-NI", {
                weekday: "short", day: "numeric", month: "short",
              });
              return (
                <div key={c.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-medium text-sm capitalize">{dateLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      Esperado {fmt(c.expected_cash)} · Contado {fmt(c.counted_cash)}
                    </p>
                  </div>
                  {cuadrado ? (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                      Cuadrado
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      {c.difference > 0 ? "+" : "−"}{fmt(Math.abs(c.difference))}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
