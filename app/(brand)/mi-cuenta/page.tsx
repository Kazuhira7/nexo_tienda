import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMoney } from "@/lib/get-currency";
import type { BrandPaymentType } from "@/types/database";

const TYPE_META: Record<BrandPaymentType, { label: string; sign: "out" | "in"; tone: string }> = {
  payout:      { label: "Pago recibido de la tienda", sign: "in",  tone: "text-emerald-600 dark:text-emerald-400" },
  fee_charge:  { label: "Cuota cargada",              sign: "out", tone: "text-amber-600 dark:text-amber-400" },
  fee_payment: { label: "Cuota pagada",               sign: "out", tone: "text-foreground" },
};

const METHOD_LABEL: Record<string, string> = {
  cash: "Efectivo", pos: "POS", transfer: "Transferencia", mixed: "Mixto",
};

export default async function BrandAccountPage() {
  const fmt = await getMoney();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("brand_id, brands(name)")
    .eq("id", user!.id)
    .single();

  const brandId = profile?.brand_id;

  // RLS already limits every query to this brand — the eq() is defense in depth
  const [{ data: items }, { data: payments }, { data: settlements }] = await Promise.all([
    supabase
      .from("sale_items")
      .select("line_total, sales(cancelled)")
      .eq("brand_id", brandId!),
    supabase
      .from("brand_payments")
      .select("*")
      .eq("brand_id", brandId!)
      .order("occurred_on", { ascending: false }),
    supabase
      .from("settlements")
      .select("*")
      .eq("brand_id", brandId!)
      .order("period_end", { ascending: false }),
  ]);

  const ventasAcum = (items ?? [])
    .filter((i) => !(i.sales as { cancelled: boolean } | null)?.cancelled)
    .reduce((acc, i) => acc + i.line_total, 0);

  const sumType = (t: BrandPaymentType) =>
    (payments ?? []).filter((p) => p.type === t).reduce((acc, p) => acc + p.amount, 0);

  const totalPayout    = sumType("payout");
  const totalFeeCharge = sumType("fee_charge");
  const totalFeePaid   = sumType("fee_payment");

  const porCobrar      = ventasAcum - totalPayout;     // what the store owes this brand
  const cuotaPendiente = totalFeeCharge - totalFeePaid; // what this brand owes the store

  const fmtDate = (d: string) =>
    new Date(`${d}T12:00:00`).toLocaleDateString("es-NI", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mi estado de cuenta</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tus ventas, pagos y cuotas con la tienda — en tiempo real.
        </p>
      </div>

      {/* Saldos principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-primary/30">
          <CardHeader className="pb-1.5">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Por cobrar a la tienda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${porCobrar > 0 ? "text-primary" : ""}`}>
              {fmt(porCobrar)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Vendido {fmt(ventasAcum)} − recibido {fmt(totalPayout)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1.5">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cuota pendiente de pagar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${cuotaPendiente > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}>
              {fmt(cuotaPendiente)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Cargado {fmt(totalFeeCharge)} − pagado {fmt(totalFeePaid)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Ventas acumuladas",  value: ventasAcum },
          { label: "Pagos recibidos",    value: totalPayout },
          { label: "Cuotas cargadas",    value: totalFeeCharge },
          { label: "Cuotas pagadas",     value: totalFeePaid },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground leading-tight">{s.label}</p>
            <p className="font-semibold mt-0.5">{fmt(s.value)}</p>
          </div>
        ))}
      </div>

      {/* Movimientos */}
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
          Movimientos
        </p>
        {!payments?.length ? (
          <div className="rounded-xl border bg-card px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              Aún no hay movimientos registrados por la tienda.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border bg-card divide-y">
            {payments.map((p) => {
              const meta = TYPE_META[p.type];
              return (
                <div key={p.id} className="flex items-center justify-between px-4 py-3 gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{meta.label}</p>
                      {p.method && (
                        <Badge variant="outline" className="text-[10px]">
                          {METHOD_LABEL[p.method] ?? p.method}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {fmtDate(p.occurred_on)}
                      {p.notes && ` · ${p.notes}`}
                    </p>
                  </div>
                  <p className={`font-semibold shrink-0 ${meta.tone}`}>
                    {meta.sign === "in" ? "+" : "−"}{fmt(p.amount)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Liquidaciones */}
      {(settlements?.length ?? 0) > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
            Liquidaciones
          </p>
          <div className="rounded-xl border bg-card divide-y">
            {settlements!.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium text-sm">
                    {fmtDate(s.period_start)} — {fmtDate(s.period_end)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Ventas {fmt(s.gross_sales)} · cuota {fmt(s.commission_amount)}
                  </p>
                </div>
                {s.status === "paid" ? (
                  <Badge className="bg-green-100 text-green-800 text-xs">Pagada</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">Pendiente</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
