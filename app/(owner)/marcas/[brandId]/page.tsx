import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeftIcon, PlusIcon } from "lucide-react";
import { getMoney } from "@/lib/get-currency";
import PaymentDialog from "@/components/marcas/payment-dialog";
import DeletePaymentButton from "@/components/marcas/delete-payment-button";
import type { BrandPaymentType } from "@/types/database";

const TYPE_META: Record<BrandPaymentType, { label: string; sign: "out" | "in"; tone: string }> = {
  payout:      { label: "Pago a la marca",  sign: "out", tone: "text-foreground" },
  fee_charge:  { label: "Cuota cargada",    sign: "in",  tone: "text-amber-600 dark:text-amber-400" },
  fee_payment: { label: "Cuota recibida",   sign: "in",  tone: "text-emerald-600 dark:text-emerald-400" },
};

const METHOD_LABEL: Record<string, string> = {
  cash: "Efectivo", pos: "POS", transfer: "Transferencia", mixed: "Mixto",
};

interface Props {
  params: Promise<{ brandId: string }>;
}

export default async function BrandAccountPage({ params }: Props) {
  const { brandId } = await params;
  const fmt = await getMoney();
  const supabase = await createClient();

  const [{ data: brand }, { data: items }, { data: payments }, { data: settlements }] =
    await Promise.all([
      supabase.from("brands").select("*").eq("id", brandId).maybeSingle(),
      supabase
        .from("sale_items")
        .select("line_total, sales(cancelled)")
        .eq("brand_id", brandId),
      supabase
        .from("brand_payments")
        .select("*")
        .eq("brand_id", brandId)
        .order("occurred_on", { ascending: false }),
      supabase
        .from("settlements")
        .select("*")
        .eq("brand_id", brandId)
        .order("period_end", { ascending: false }),
    ]);

  if (!brand) notFound();

  // Ventas acumuladas (excluye anuladas)
  const ventasAcum = (items ?? [])
    .filter((i) => !(i.sales as { cancelled: boolean } | null)?.cancelled)
    .reduce((acc, i) => acc + i.line_total, 0);

  const sumType = (t: BrandPaymentType) =>
    (payments ?? []).filter((p) => p.type === t).reduce((acc, p) => acc + p.amount, 0);

  const totalPayout    = sumType("payout");
  const totalFeeCharge = sumType("fee_charge");
  const totalFeePaid   = sumType("fee_payment");

  const porPagar       = ventasAcum - totalPayout;     // lo que la tienda le debe a la marca
  const cuotaPendiente = totalFeeCharge - totalFeePaid; // lo que la marca le debe a la tienda

  const fmtDate = (d: string) =>
    new Date(`${d}T12:00:00`).toLocaleDateString("es-NI", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Encabezado */}
      <div>
        <Link href="/marcas" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
          <ChevronLeftIcon className="size-4" /> Marcas
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">{brand.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {brand.contact_name ?? "Sin contacto"}
              {brand.phone && ` · ${brand.phone}`}
            </p>
          </div>
          <PaymentDialog
            brandId={brand.id}
            spaceFee={brand.space_fee}
            trigger={
              <Button variant="cta" className="gap-1.5 shrink-0">
                <PlusIcon className="size-4" /> Movimiento
              </Button>
            }
          />
        </div>
      </div>

      {/* Saldos principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-primary/30">
          <CardHeader className="pb-1.5">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Por pagar a la marca
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${porPagar > 0 ? "text-primary" : ""}`}>
              {fmt(porPagar)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Vendido {fmt(ventasAcum)} − pagado {fmt(totalPayout)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1.5">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cuota pendiente
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

      {/* Resumen secundario */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Ventas acumuladas", value: ventasAcum },
          { label: "Pagado a la marca", value: totalPayout },
          { label: "Cuotas cargadas",   value: totalFeeCharge },
          { label: "Cuotas pagadas",    value: totalFeePaid },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground leading-tight">{s.label}</p>
            <p className="font-semibold mt-0.5">{fmt(s.value)}</p>
          </div>
        ))}
      </div>

      {/* Historial de movimientos */}
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
          Movimientos
        </p>
        {!payments?.length ? (
          <div className="rounded-xl border bg-card px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              Aún no hay movimientos. Registra un pago a la marca o una cuota.
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
                  <div className="flex items-center gap-3 shrink-0">
                    <p className={`font-semibold ${meta.tone}`}>
                      {meta.sign === "out" ? "−" : "+"}{fmt(p.amount)}
                    </p>
                    <DeletePaymentButton id={p.id} brandId={brand.id} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Liquidaciones registradas (referencia) */}
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
