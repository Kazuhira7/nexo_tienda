import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/app-shell";
import type { CurrencyCode, ModuleId, VerticalType } from "@/types/database";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, organization_id, organizations(name, currency, exchange_rate, vertical, enabled_modules)")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "owner") redirect("/");

  const orgData = profile.organizations as {
    name:            string;
    currency:        CurrencyCode;
    exchange_rate:   number;
    vertical:        VerticalType;
    enabled_modules: ModuleId[];
  } | null;

  return (
    <AppShell
      userName={profile.full_name ?? user.email ?? "Dueña"}
      orgName={orgData?.name ?? "Mi Tienda"}
      currency={orgData?.currency ?? "NIO"}
      exchangeRate={orgData?.exchange_rate ?? 36.63}
      vertical={orgData?.vertical ?? "colectivo"}
      modules={orgData?.enabled_modules ?? []}
      role="owner"
    >
      {children}
    </AppShell>
  );
}
