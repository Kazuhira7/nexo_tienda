import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/staff-session";
import AppShell from "@/components/app-shell";
import PinPad from "@/components/staff/pin-pad";
import StaffBar from "@/components/staff/staff-bar";
import type { CurrencyCode, ModuleId, VerticalType } from "@/types/database";

// Operational restaurant screens (salón, órdenes, cobro, cocina).
// Open to the owner and to the device account ("terminal"), but every
// action runs as the staff member who entered their PIN on this device.
export default async function RestauranteLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, organizations(name, currency, exchange_rate, vertical, enabled_modules)")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "owner" && profile.role !== "terminal")) redirect("/");

  const orgData = profile.organizations as {
    name:            string;
    currency:        CurrencyCode;
    exchange_rate:   number;
    vertical:        VerticalType;
    enabled_modules: ModuleId[];
  } | null;

  const modules = orgData?.enabled_modules ?? [];
  if (!modules.includes("restaurant")) redirect("/");

  const orgName = orgData?.name ?? "Mi Restaurante";
  const staff = await getCurrentStaff();

  // No PIN session on this device → lock screen instead of the page
  if (!staff) {
    return <PinPad orgName={orgName} canLeave={profile.role === "owner"} />;
  }

  return (
    <AppShell
      userName={profile.full_name ?? user.email ?? orgName}
      orgName={orgName}
      currency={orgData?.currency ?? "NIO"}
      exchangeRate={orgData?.exchange_rate ?? 36.63}
      vertical={orgData?.vertical ?? "restaurante"}
      modules={modules}
      role={profile.role}
      topBar={<StaffBar name={staff.name} position={staff.position} />}
    >
      {children}
    </AppShell>
  );
}
