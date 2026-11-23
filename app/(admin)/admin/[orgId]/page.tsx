import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import EditOrgForm from "@/components/admin/edit-org-form";
import CreateOrgUserForm from "@/components/admin/create-org-user-form";
import OrgModulesForm from "@/components/admin/org-modules-form";
import { VERTICAL_INFO } from "@/lib/modules";
import { localDateString } from "@/lib/dates";
import { formatNio } from "@/lib/site";
import BillingStatusBadge, { PAYMENT_METHOD_LABEL } from "@/components/admin/billing-status";
import { BillingForm, PaymentForm, DeletePaymentButton, NoteForm } from "@/components/admin/billing-forms";

const CURRENCY_LABEL: Record<string, string> = { NIO: "C$ Córdoba", USD: "$ Dólar" };
const MODEL_LABEL: Record<string, string> = {
  space_fee: "Cuota por espacio", commission: "Comisión %",
  both: "Cuota + Comisión", none: "Sin cobro",
};

interface Props { params: Promise<{ orgId: string }> }

export default async function OrgDetailPage({ params }: Props) {
  const { orgId } = await params;
  const supabase = await createClient();
  const admin    = createAdminClient();

  const { data: org } = await supabase
    .from("organizations").select("*").eq("id", orgId).single();

  if (!org) notFound();

  const [{ data: overview }, { data: payments }, { data: notes }, { data: settings }] = await Promise.all([
    supabase.rpc("admin_orgs_overview"),
    supabase.from("subscription_payments").select("*").eq("organization_id", orgId).order("period_end", { ascending: false }),
    supabase.from("admin_notes").select("id, body, created_at").eq("organization_id", orgId).order("created_at", { ascending: false }),
    supabase.from("platform_settings").select("fee_restaurante, fee_retail, fee_colectivo").eq("id", 1).single(),
  ]);
  const billing = (overview ?? []).find((o) => o.id === orgId);
  const defaultFee = settings
    ? org.vertical === "restaurante" ? settings.fee_restaurante
      : org.vertical === "retail" ? settings.fee_retail : settings.fee_colectivo
    : null;
  const tz = org.timezone;
  const shortDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("es-NI", { day: "numeric", month: "short", year: "numeric" });

  const [{ data: brands }, { data: products }, { data: profiles }, { data: { users } }] =
    await Promise.all([
      admin.from("brands").select("id, name, active, space_fee, commission_rate").eq("organization_id", orgId).order("name"),
      admin.from("products").select("id, name, code, active, stock_quantity").eq("organization_id", orgId).order("name"),
      admin.from("profiles").select("id, role, full_name").eq("organization_id", orgId),
      admin.auth.admin.listUsers({ perPage: 1000 }),
    ]);

  const orgUsers = (profiles ?? []).map(p => {
    const user = (users ?? []).find(u => u.id === p.id);
    return { ...p, email: user?.email };
  });

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin" className="hover:text-foreground transition-colors">Negocios</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{org.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{org.name}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">/{org.slug}</span>
            {billing && <BillingStatusBadge status={billing.status} daysLeft={billing.days_left} />}
            <Badge variant="outline" className="text-primary border-primary/40">
              {VERTICAL_INFO[org.vertical]?.label ?? org.vertical}
            </Badge>
            <span className="text-sm text-muted-foreground">{CURRENCY_LABEL[org.currency]}</span>
            <span className="text-sm text-muted-foreground">{MODEL_LABEL[org.settlement_model]}</span>
          </div>
        </div>
      </div>

      {/* Cobro */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-semibold text-base">Cobro</h2>
            <p className="text-sm text-muted-foreground">
              {org.paid_until ? `Pagado hasta el ${shortDate(org.paid_until)}` : "Sin pagos registrados"}
            </p>
          </div>
          <BillingForm
            orgId={orgId}
            active={org.active}
            exempt={org.billing_exempt}
            monthlyFee={org.monthly_fee}
            defaultFee={defaultFee}
            ownerPhone={org.owner_phone}
            trialEndsAt={org.trial_ends_at ? localDateString(tz, new Date(org.trial_ends_at)) : null}
          />
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Notas internas</h3>
            <NoteForm orgId={orgId} />
            {(notes ?? []).map((n) => (
              <div key={n.id} className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                <p className="whitespace-pre-wrap">{n.body}</p>
                <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString("es-NI", { timeZone: tz, dateStyle: "medium", timeStyle: "short" })}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <h2 className="font-semibold text-base">Registrar pago</h2>
          <PaymentForm orgId={orgId} suggestedAmount={billing?.monthly_fee ?? defaultFee} today={localDateString(tz)} />
          <div className="rounded-xl border bg-card divide-y">
            {(payments ?? []).map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm tabular-nums">
                    {formatNio(p.amount)} · {p.months === 1 ? "1 mes" : `${p.months} meses`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {shortDate(p.period_start)} – {shortDate(p.period_end)} · {PAYMENT_METHOD_LABEL[p.method] ?? p.method}
                    {p.notes ? ` · ${p.notes}` : ""}
                  </p>
                </div>
                <DeletePaymentButton orgId={orgId} paymentId={p.id} />
              </div>
            ))}
            {(payments ?? []).length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">Todavía no hay pagos</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuración */}
        <div className="space-y-4">
          <h2 className="font-semibold text-base">Configuración</h2>
          <EditOrgForm org={org} />
          <h2 className="font-semibold text-base pt-2">Módulos activos</h2>
          <OrgModulesForm orgId={orgId} enabled={org.enabled_modules ?? []} />
        </div>

        {/* Usuarios */}
        <div className="space-y-4">
          <h2 className="font-semibold text-base">Usuarios ({orgUsers.length})</h2>
          <div className="rounded-xl border bg-card divide-y">
            {orgUsers.map(u => (
              <div key={u.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium text-sm">{u.full_name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <Badge variant="outline" className="text-xs capitalize">{u.role}</Badge>
              </div>
            ))}
            {orgUsers.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">Sin usuarios</p>
            )}
          </div>
          <CreateOrgUserForm orgId={orgId} />
        </div>
      </div>

      {/* Marcas del negocio */}
      <div className="space-y-3">
        <h2 className="font-semibold text-base">{brands?.length ?? 0} marcas</h2>
        <div className="rounded-xl border bg-card divide-y">
          {(brands ?? []).map(b => (
            <div key={b.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium text-sm">{b.name}</p>
                <p className="text-xs text-muted-foreground">
                  {b.space_fee > 0 && `Cuota: ${org.currency === "USD" ? "$" : "C$"}${b.space_fee}`}
                  {b.commission_rate > 0 && ` · Comisión: ${b.commission_rate}%`}
                </p>
              </div>
              <Badge variant={b.active ? "outline" : "secondary"} className="text-xs">
                {b.active ? "Activa" : "Inactiva"}
              </Badge>
            </div>
          ))}
          {(brands ?? []).length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Sin marcas</p>
          )}
        </div>
      </div>

      {/* Stats de productos */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold text-base mb-3">{products?.length ?? 0} productos</h2>
        <div className="flex gap-6 text-sm">
          <div>
            <p className="text-2xl font-bold">{(products ?? []).filter(p => p.active).length}</p>
            <p className="text-muted-foreground">Activos</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{(products ?? []).filter(p => !p.active).length}</p>
            <p className="text-muted-foreground">Inactivos</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-destructive">
              {(products ?? []).filter(p => p.active && p.stock_quantity === 0).length}
            </p>
            <p className="text-muted-foreground">Sin stock</p>
          </div>
        </div>
      </div>
    </div>
  );
}
