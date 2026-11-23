import Link from "next/link";
import { MessageCircleIcon, PlusIcon, StoreIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BillingStatusBadge from "@/components/admin/billing-status";
import { VERTICAL_INFO } from "@/lib/modules";
import { formatNio } from "@/lib/site";
import type { AdminOrgOverview, BillingStatus } from "@/types/database";

const PAYING: BillingStatus[] = ["al_dia", "por_vencer", "gracia"];

type Filter = "todos" | "prueba" | "pagando" | "atencion" | "sin_cobro";
const FILTERS: { id: Filter; label: string; match: (o: AdminOrgOverview) => boolean }[] = [
  { id: "todos",     label: "Todos",           match: () => true },
  { id: "atencion",  label: "Requieren atención", match: (o) => ["vencido", "gracia", "por_vencer"].includes(o.status) || (o.status === "prueba" && (o.days_left ?? 99) <= 3) },
  { id: "prueba",    label: "En prueba",       match: (o) => o.status === "prueba" },
  { id: "pagando",   label: "Pagando",         match: (o) => PAYING.includes(o.status) },
  { id: "sin_cobro", label: "Sin cobro / pausados", match: (o) => o.status === "exento" || o.status === "suspendido" },
];

function waLink(phone: string, orgName: string) {
  const digits = phone.replace(/\D/g, "");
  const full = digits.length === 8 ? `505${digits}` : digits; // Nicaraguan local numbers
  return `https://wa.me/${full}?text=${encodeURIComponent(`Hola, te escribo de nexo sobre "${orgName}".`)}`;
}

function relative(date: string | null) {
  if (!date) return "Sin actividad";
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
  if (days <= 0) return "Activo hoy";
  if (days === 1) return "Activo ayer";
  return `Última actividad hace ${days} días`;
}

interface Props { searchParams: Promise<{ f?: string }> }

export default async function AdminPage({ searchParams }: Props) {
  const { f } = await searchParams;
  const filter = FILTERS.find((x) => x.id === f) ?? FILTERS[0];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_orgs_overview");
  const orgs = data ?? [];
  const shown = orgs.filter(filter.match);

  const paying = orgs.filter((o) => PAYING.includes(o.status));
  const monthly = paying.reduce((sum, o) => sum + (o.monthly_fee ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-heading">Negocios</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{orgs.length} negocios en nexo</p>
        </div>
        <Link href="/admin/nueva-org">
          <Button variant="cta" className="gap-1.5"><PlusIcon className="size-4" /> Nuevo negocio</Button>
        </Link>
      </div>

      {error && (
        <p className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          No se pudo cargar el resumen: {error.message}
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Pagando",            value: paying.length },
          { label: "En prueba",          value: orgs.filter((o) => o.status === "prueba").length },
          { label: "Vencidos",           value: orgs.filter((o) => o.status === "vencido").length },
          { label: "Ingreso mensual",    value: formatNio(monthly) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1 tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((x) => (
          <Link key={x.id} href={x.id === "todos" ? "/admin" : `/admin?f=${x.id}`}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors ${
              x.id === filter.id ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
            }`}>
            {x.label} ({orgs.filter(x.match).length})
          </Link>
        ))}
      </div>

      <div className="space-y-3">
        {shown.length === 0 && (
          <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
            <StoreIcon className="size-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No hay negocios en esta vista</p>
          </div>
        )}

        {shown.map((org) => (
          <div key={org.id} className="rounded-xl border bg-card p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3">
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-semibold text-lg">{org.name}</h2>
                  <BillingStatusBadge status={org.status} daysLeft={org.days_left} />
                  <Badge variant="outline" className="text-xs text-primary border-primary/40">
                    {VERTICAL_INFO[org.vertical]?.label ?? org.vertical}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {org.owner_name ?? "Sin dueño"}{org.owner_email ? ` · ${org.owner_email}` : ""}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span>{org.monthly_fee != null ? `${formatNio(org.monthly_fee)}/mes` : "Sin tarifa"}</span>
                  <span>Este mes: {formatNio(org.sales_month)} en ventas</span>
                  <span>{relative(org.last_activity)}</span>
                  <span>{org.users} {org.users === 1 ? "usuario" : "usuarios"}</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {org.owner_phone && (
                  <a href={waLink(org.owner_phone, org.name)} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <MessageCircleIcon className="size-4" /> WhatsApp
                    </Button>
                  </a>
                )}
                <Link href={`/admin/${org.id}`}>
                  <Button variant="outline" size="sm">Ver detalle</Button>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
