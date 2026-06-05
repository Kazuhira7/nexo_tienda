import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusIcon, StoreIcon } from "lucide-react";

const CURRENCY_LABEL: Record<string, string> = { NIO: "C$ Córdoba", USD: "$ Dólar" };
const MODEL_LABEL: Record<string, { label: string; color: string }> = {
  space_fee:  { label: "Cuota espacio",    color: "bg-blue-100 text-blue-700" },
  commission: { label: "Comisión %",       color: "bg-purple-100 text-purple-700" },
  both:       { label: "Cuota + Comisión", color: "bg-amber-100 text-amber-700" },
  none:       { label: "Sin cobro",        color: "bg-gray-100 text-gray-600" },
};

export default async function AdminPage() {
  const supabase = await createClient();
  const admin    = createAdminClient();

  const [{ data: orgs }, { data: { users } }] = await Promise.all([
    supabase.from("organizations").select("*").order("created_at"),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  // Stats por org
  const orgIds = (orgs ?? []).map(o => o.id);
  const [{ data: brandCounts }, { data: productCounts }, { data: salesData }] = await Promise.all([
    admin.from("brands").select("organization_id").in("organization_id", orgIds).eq("active", true),
    admin.from("products").select("organization_id").in("organization_id", orgIds).eq("active", true),
    admin.from("sales").select("organization_id, total").in("organization_id", orgIds).eq("cancelled", false),
  ]);

  const statsMap = new Map<string, { brands: number; products: number; sales: number; revenue: number }>();
  for (const id of orgIds) {
    statsMap.set(id, {
      brands:   (brandCounts   ?? []).filter(r => r.organization_id === id).length,
      products: (productCounts ?? []).filter(r => r.organization_id === id).length,
      sales:    (salesData     ?? []).filter(r => r.organization_id === id).length,
      revenue:  (salesData     ?? []).filter(r => r.organization_id === id).reduce((s, r) => s + r.total, 0),
    });
  }

  const ownerCount = (users ?? []).filter(u => {
    // Count non-superadmin users
    return true;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading">Nexo Colectivo</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {orgs?.length ?? 0} negocios · {users?.length ?? 0} usuarios totales
          </p>
        </div>
        <Link href="/admin/nueva-org">
          <Button variant="cta" className="gap-1.5">
            <PlusIcon className="size-4" />
            Nuevo negocio
          </Button>
        </Link>
      </div>

      {/* KPIs globales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Negocios activos", value: (orgs ?? []).filter(o => o.active).length },
          { label: "Marcas totales",   value: (brandCounts ?? []).length },
          { label: "Productos totales",value: (productCounts ?? []).length },
          { label: "Ventas totales",   value: (salesData ?? []).length },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Lista de negocios */}
      <div className="space-y-3">
        {(orgs ?? []).length === 0 && (
          <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
            <StoreIcon className="size-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No hay negocios registrados</p>
            <p className="text-sm mt-1">Crea el primer negocio para comenzar</p>
          </div>
        )}

        {(orgs ?? []).map(org => {
          const stats = statsMap.get(org.id)!;
          const model = MODEL_LABEL[org.settlement_model] ?? MODEL_LABEL.none;

          return (
            <div key={org.id} className="rounded-xl border bg-card p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start gap-4">
                {/* Info principal */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-semibold text-lg">{org.name}</h2>
                    <Badge variant={org.active ? "outline" : "secondary"} className="text-xs">
                      {org.active ? "Activo" : "Inactivo"}
                    </Badge>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${model.color}`}>
                      {model.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">/{org.slug}</span>
                    <span>{CURRENCY_LABEL[org.currency] ?? org.currency}</span>
                    <span>{org.settlement_period === "quincenal" ? "Quincenal" : "Mensual"}</span>
                    <span>Desde {new Date(org.created_at).toLocaleDateString("es-NI", { month: "short", year: "numeric" })}</span>
                  </div>

                  {/* Stats del negocio */}
                  <div className="flex flex-wrap gap-4 pt-1">
                    {[
                      { label: "Marcas",    value: stats.brands },
                      { label: "Productos", value: stats.products },
                      { label: "Ventas",    value: stats.sales },
                      {
                        label: "Revenue",
                        value: org.currency === "USD"
                          ? `$${stats.revenue.toFixed(0)}`
                          : `C$${stats.revenue.toFixed(0)}`,
                      },
                    ].map(({ label, value }) => (
                      <div key={label} className="text-center">
                        <p className="text-lg font-bold leading-none">{value}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Acciones */}
                <div className="shrink-0">
                  <Link href={`/admin/${org.id}`}>
                    <Button variant="outline" size="sm">Ver detalle</Button>
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
