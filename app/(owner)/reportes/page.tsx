import Link from "next/link";
import { requireModule } from "@/lib/require-module";
import { getOrgContext } from "@/lib/org-context";
import { getMoney } from "@/lib/get-currency";
import { isDayString, localDateString, shiftDay } from "@/lib/dates";
import { getRestaurantReport, orderLabel } from "@/lib/restaurant-report";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import BarList from "@/components/restaurante/reportes/bar-list";
import AnimatedNumber from "@/components/ui/animated-number";
import { METHOD_LABEL } from "@/components/restaurante/ticket-labels";

interface Props {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}

export default async function ReportesPage({ searchParams }: Props) {
  await requireModule("restaurant");
  const { timezone } = await getOrgContext();
  const fmt = await getMoney();
  const params = await searchParams;

  const today = localDateString(timezone);
  const from = isDayString(params.desde) ? params.desde : today;
  const to = isDayString(params.hasta) && params.hasta >= from ? params.hasta : from === today ? today : from;

  const presets = [
    { label: "Hoy",      from: today,                   to: today },
    { label: "Ayer",     from: shiftDay(today, -1),     to: shiftDay(today, -1) },
    { label: "7 días",   from: shiftDay(today, -6),     to: today },
    { label: "Este mes", from: `${today.slice(0, 8)}01`, to: today },
  ];

  const { report, error } = await getRestaurantReport(from, to);

  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString("es-NI", { timeZone: timezone, hour: "2-digit", minute: "2-digit" });
  const dayLabel = (day: string) =>
    new Date(`${day}T12:00:00Z`).toLocaleDateString("es-NI", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });
  const singleDay = from === to;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-bold">Reportes</h1>
          <p className="text-sm text-muted-foreground mt-0.5 capitalize">
            {singleDay ? dayLabel(from) : `${dayLabel(from)} — ${dayLabel(to)}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {presets.map((p) => {
            const on = p.from === from && p.to === to;
            return (
              <Link key={p.label} href={`/reportes?desde=${p.from}&hasta=${p.to}`}
                className={`h-9 px-4 rounded-full border text-sm font-medium flex items-center transition-colors ${
                  on ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted"
                }`}>
                {p.label}
              </Link>
            );
          })}
          <form className="flex items-center gap-2" action="/reportes">
            <Input type="date" name="desde" defaultValue={from} max={today} className="h-9 w-auto" aria-label="Desde" />
            <span className="text-muted-foreground text-sm">a</span>
            <Input type="date" name="hasta" defaultValue={to} max={today} className="h-9 w-auto" aria-label="Hasta" />
            <Button type="submit" variant="outline" size="lg">Ver</Button>
          </form>
        </div>
      </div>

      {error || !report ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error ?? "No se pudo cargar el reporte"}
        </p>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi i={0} label="Ventas" value={<AnimatedNumber value={report.totals.sales} fromZero />}
              sub={report.totals.discounts > 0 ? `Descuentos ${fmt(report.totals.discounts)}` : undefined} />
            <Kpi i={1} label="Órdenes cobradas" value={<AnimatedNumber value={report.totals.orders} format="int" fromZero />}
              sub={report.totals.takeaway > 0 ? `${report.totals.takeaway} para llevar` : undefined} />
            <Kpi i={2} label="Ticket promedio"
              value={report.totals.orders ? <AnimatedNumber value={report.totals.sales / report.totals.orders} fromZero /> : "—"} />
            <Kpi i={3} label="Personas atendidas" value={<AnimatedNumber value={report.totals.guests} format="int" fromZero />}
              sub="En mesas (sin para llevar)" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="Ventas por hora">
              <BarList rows={report.by_hour.map((h) => ({
                key: String(h.hour), label: `${String(h.hour).padStart(2, "0")}:00`,
                value: h.total, right: fmt(h.total), sub: `${h.orders} órd.`,
              }))} />
            </Section>
            {singleDay ? (
              <Section title="Métodos de pago">
                <BarList rows={report.by_method.map((m) => ({
                  key: m.method, label: METHOD_LABEL[m.method], value: m.total, right: fmt(m.total), sub: `${m.count} pagos`,
                }))} />
              </Section>
            ) : (
              <Section title="Ventas por día">
                <BarList rows={report.by_day.map((d) => ({
                  key: d.day, label: dayLabel(d.day), value: d.total, right: fmt(d.total), sub: `${d.orders} órd.`,
                }))} />
              </Section>
            )}
            {!singleDay && (
              <Section title="Métodos de pago">
                <BarList rows={report.by_method.map((m) => ({
                  key: m.method, label: METHOD_LABEL[m.method], value: m.total, right: fmt(m.total), sub: `${m.count} pagos`,
                }))} />
              </Section>
            )}
            <Section title="Platillos más vendidos">
              <BarList rows={report.top_items.slice(0, 10).map((i) => ({
                key: i.name, label: i.name, value: i.qty, right: `${i.qty} · ${fmt(i.revenue)}`,
              }))} />
            </Section>
            <Section title="Ventas por categoría">
              <BarList rows={report.by_category.map((c) => ({
                key: c.name, label: c.name, value: c.revenue, right: fmt(c.revenue), sub: `${c.qty} platillos`,
              }))} />
            </Section>
            <Section title="Por mesero">
              <BarList rows={report.by_waiter.map((w) => ({
                key: w.name, label: w.name, value: w.total, right: fmt(w.total), sub: `${w.orders} órd.`,
              }))} />
            </Section>
          </div>

          {/* Cancelaciones y anulaciones */}
          {(report.cancelled_orders.length > 0 || report.voided_items.length > 0) && (
            <Section title="Cancelaciones y anulaciones">
              <ul className="divide-y text-sm">
                {report.cancelled_orders.map((c) => (
                  <li key={c.id} className="py-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">
                        Orden cancelada · {orderLabel({ type: c.table ? "dine_in" : "takeaway", table: c.table, name: c.name, number: c.number })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {time(c.at)} · {c.by ?? "—"} · “{c.reason}”
                      </p>
                    </div>
                    <span className="text-destructive font-medium shrink-0">{fmt(c.value)}</span>
                  </li>
                ))}
                {report.voided_items.map((v, i) => (
                  <li key={i} className="py-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">Platillo anulado · {v.qty} {v.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Orden #{v.number} · {time(v.at)} · autorizó {v.by ?? "—"}
                      </p>
                    </div>
                    <span className="text-destructive font-medium shrink-0">{fmt(v.value)}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Órdenes del periodo */}
          <Section title={`Órdenes cerradas (${report.orders.length})`}>
            {report.orders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Sin órdenes cerradas en este periodo</p>
            ) : (
              <ul className="divide-y">
                {report.orders.map((o) => (
                  <li key={o.id}>
                    <Link href={`/reportes/orden/${o.id}`}
                      className="py-2.5 flex items-center justify-between gap-3 hover:bg-muted/50 -mx-2 px-2 rounded-lg transition-colors active:scale-[0.99]">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">#{o.number} · {orderLabel(o)}</p>
                        <p className="text-xs text-muted-foreground">
                          {!singleDay && `${dayLabel(localDateString(timezone, new Date(o.closed_at)))} · `}{time(o.closed_at)}{o.waiter && ` · ${o.waiter}`}
                        </p>
                      </div>
                      {o.status === "cancelled"
                        ? <Badge variant="outline">Cancelada</Badge>
                        : <span className="text-sm font-semibold shrink-0">{fmt(o.total)}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, sub, i = 0 }: { label: string; value: React.ReactNode; sub?: string; i?: number }) {
  return (
    <Card className="animate-enter" style={{ "--i": i } as React.CSSProperties}>
      <CardHeader className="pb-1.5">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3 animate-enter" style={{ "--i": 4 } as React.CSSProperties}>
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </div>
  );
}
