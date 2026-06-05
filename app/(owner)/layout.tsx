import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OwnerSidebar from "@/components/owner-sidebar";
import MobileHeader from "@/components/mobile-header";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import { OrgProvider } from "@/components/org-provider";
import type { CurrencyCode } from "@/types/database";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, organization_id, organizations(name, currency)")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "owner") redirect("/mi-tienda");

  const orgData    = profile.organizations as { name: string; currency: CurrencyCode; exchange_rate?: number } | null;
  const orgName    = orgData?.name ?? "Mi Tienda";
  const currency   = orgData?.currency ?? "NIO";
  const exchangeRate = orgData?.exchange_rate ?? 36.63;
  const userName   = profile.full_name ?? user.email ?? "Dueña";

  return (
    <OrgProvider currency={currency} exchangeRate={exchangeRate} orgName={orgName}>
      <div className="min-h-screen bg-background">
        <OwnerSidebar userName={userName} orgName={orgName} />
        <div className="lg:pl-56">
          <MobileHeader userName={userName} orgName={orgName} />
          <main className="p-4 sm:p-6 pb-24 lg:pb-8 min-h-screen">
            {children}
          </main>
        </div>
        <MobileBottomNav />
      </div>
    </OrgProvider>
  );
}
