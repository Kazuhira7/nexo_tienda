// Inicio for restaurant orgs (server component): today at a glance + shortcuts.
import Link from "next/link";
import {
  UtensilsCrossedIcon, BookOpenIcon, LayoutGridIcon, IdCardIcon, BarChart3Icon, CalculatorIcon, TrendingUpIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMoney } from "@/lib/get-currency";
import { getOrgContext } from "@/lib/org-context";
import { localDateString } from "@/lib/dates";
import { getRestaurantReport } from "@/lib/restaurant-report";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BarList from "@/components/restaurante/reportes/bar-list";

export default async function RestaurantDashboard() {
  const fmt = await getMoney();
  const { timezone, modules } = await getOrgContext();
  const today = localDateString(timezone);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ report }, { data: tables }, { data: openOrders }, { count: menuCount }, { data: me }] = await Promise.all([
    getRestaurantReport(today, today),
    supabase.from("dining_tables").select("status").eq("active", true),
    supabase.from("orders").select("id").eq("status", "open"),
    supabase.from("menu_items").select("id", { count: "exact", head: true }).eq("active", true),
    supabase.from("staff_members").select("id").eq("profile_id", user?.id ?? "").maybeSingle(),
  ]);

  const occupied = (tables ?? []).filter((t) => t.status !== "free").length;
  const openIds = (openOrders ?? []).map((o) => o.id);
  const { data: openItems } = openIds.length
    ? await supabase.from("order_items").select("line_total").in("order_id", openIds).neq("status", "cancelled")
    : { data: [] as { line_total: number }[] };
  const openTotal = (openItems ?? []).reduce((s, i) => s + Number(i.line_total), 0);

  const todayLabel = new Date(`${today}T12:00:00Z`).toLocaleDateString("es-NI", {
    timeZone: "UTC", weekday: "long", day: "numeric", month: "long",
  });

  const shortcuts = [
    { href: "/salon",    label: "Salón",    icon: UtensilsCrossedIcon },
    { href: "/reportes", label: "Reportes", icon: BarChart3Icon },
    { href: "/menu",     label: "Menú",     icon: BookOpenIcon },
    { href: "/mesas",    label: "Mesas",    icon: LayoutGridIcon },
    { href: "/equipo",   label: "Equipo",   icon: IdCardIcon },
    ...(modules.includes("cash") ? [{ href: "/caja", label: "Cierre de caja", icon: CalculatorIcon }] : []),
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Inicio</h1>
        <p className="text-muted-foreground text-sm mt-1 capitalize">{todayLabel}</p>
      </div>

      {/* Setup reminders */}
      {(!me || !menuCount || !tables?.length) && (
        <div className="rounded-xl border border-dashed bg-primary/5 px-4 py-3 space-y-1.5 text-sm">
          <p className="font-medium">Para empezar a usar el salón:</p>
          <ul className="space-y-1 text-muted-foreground">
            {!menuCount && <li>• Arma tu <Link href="/menu" className="text-primary underline-offset-4 hover:underline">menú</Link></li>}
            {!tables?.length && <li>• Crea tus <Link href="/mesas" className="text-primary underline-offset-4 hover:underline">mesas</Link></li>}
            {!me && <li>• Crea tu PIN y el de tu gente en <Link href="/equipo" className="text-primary underline-offset-4 hover:underline">Equipo</Link></li>}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon label="Ventas hoy" value={fmt(report?.totals.sales ?? 0)}
          sub={`${report?.totals.orders ?? 0} órdenes cobradas`} />
        <Kpi label="Mesas ocupadas" value={`${occupied} / ${tables?.length ?? 0}`} />
        <Kpi label="En mesas ahora" value={fmt(openTotal)} sub={`${openIds.length} órdenes abiertas`} />
        <Kpi label="Ticket promedio"
          value={report?.totals.orders ? fmt(report.totals.sales / report.totals.orders) : "—"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Lo más vendido hoy</CardTitle></CardHeader>
          <CardContent>
            <BarList empty="Aún no hay ventas hoy" rows={(report?.top_items ?? []).slice(0, 5).map((i) => ({
              key: i.name, label: i.name, value: i.qty, right: `${i.qty} · ${fmt(i.revenue)}`,
            }))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Accesos</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-3 gap-2">
            {shortcuts.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-center">
                <Icon className="size-5 text-primary" />
                <span className="text-xs font-medium">{label}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon?: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-1.5">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
          {icon && <TrendingUpIcon className="size-4 text-primary" />}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}
