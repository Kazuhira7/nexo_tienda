import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LockIcon, MessageCircleIcon, ShieldCheckIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrgAccess } from "@/lib/org-access";
import { SALES, formatNio, whatsappUrl } from "@/lib/site";
import BrandBackdrop from "@/components/auth/brand-backdrop";
import SignOutButton from "@/components/sign-out-button";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: `Activa tu cuenta · ${BRAND.name}` };

const DATE = new Intl.DateTimeFormat("es-NI", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Managua" });

// Wall for a blocked business (trial over, payment lapsed, suspended). Data stays intact:
// once the payment is recorded in the admin, the next page load opens the app again.
export default async function SuscripcionPage() {
  const access = await getOrgAccess();
  if (!access || access.is_open) redirect("/");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user?.id ?? "").single();
  const isOwner = profile?.role === "owner";

  const suspended = access.status === "suspendido";
  const hadPaid = access.paid_until != null;
  const title = suspended ? "Tu cuenta está pausada" : hadPaid ? "Tu mensualidad venció" : "Tu prueba gratis terminó";
  const detail = suspended
    ? "El acceso a este negocio está pausado. Escríbenos y lo resolvemos."
    : hadPaid
      ? `Tu último periodo pagado terminó el ${DATE.format(new Date(access.paid_until + "T12:00:00"))}.`
      : `Esperamos que ${BRAND.name} te haya servido estos días. Para seguir usándolo, activa tu mensualidad.`;

  const number = access.sales_whatsapp || SALES.whatsapp;
  const wa = number
    ? `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola, quiero activar ${BRAND.name} para "${access.org_name}".`)}`
    : whatsappUrl(`Hola, quiero activar ${BRAND.name} para "${access.org_name}".`);

  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-brand-deep text-white flex items-center justify-center px-5 py-10">
      <BrandBackdrop />
      <div className="relative z-10 w-full max-w-md">
        <div className="flex items-baseline gap-2 mb-8">
          <span className="font-heading text-3xl font-bold tracking-tight">{BRAND.name}</span>
          <span className="text-xs font-medium text-white/60">by {BRAND.company}</span>
        </div>

        <div className="rounded-3xl bg-card text-card-foreground p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="space-y-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <LockIcon className="size-6" />
            </span>
            <h1 className="font-heading text-2xl font-bold tracking-tight">{title}</h1>
            <p className="text-muted-foreground">{detail}</p>
          </div>

          {!suspended && access.monthly_fee != null && (
            <div className="rounded-2xl bg-muted/60 p-4">
              <p className="text-sm text-muted-foreground">{access.org_name}</p>
              <p className="mt-1 flex items-baseline gap-1.5">
                <span className="font-heading text-3xl font-bold tabular-nums">{formatNio(access.monthly_fee)}</span>
                <span className="text-muted-foreground">/ mes</span>
              </p>
            </div>
          )}

          <p className="flex gap-2.5 text-sm text-muted-foreground">
            <ShieldCheckIcon className="size-5 shrink-0 text-primary" />
            Tus ventas, productos y configuración siguen guardados. Al activar tu cuenta vuelves a entrar tal como lo dejaste.
          </p>

          {isOwner ? (
            wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer"
                className="h-14 w-full rounded-2xl bg-brand-accent text-white text-base font-semibold inline-flex items-center justify-center gap-2
                           shadow-[0_14px_32px_-12px_rgba(255,92,26,0.85)] hover:brightness-110 active:scale-[0.97] transition-all">
                <MessageCircleIcon className="size-5" />
                {suspended ? "Escribirnos por WhatsApp" : "Activar por WhatsApp"}
              </a>
            )
          ) : (
            <p className="rounded-2xl border p-4 text-sm">
              Avísale a la persona encargada del negocio para que active la cuenta.
            </p>
          )}

          <p className="text-xs text-muted-foreground">Atención: {access.support_hours}.</p>
        </div>

        <div className="mt-6 flex justify-center">
          <SignOutButton className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors" />
        </div>
      </div>
    </main>
  );
}
