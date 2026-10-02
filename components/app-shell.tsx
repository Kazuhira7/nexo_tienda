// App chrome shared by every signed-in business route group: org context,
// sidebar (desktop), header + bottom nav (mobile). Navigation is filtered by
// the org's enabled modules and the user's auth role.
import OwnerSidebar from "@/components/owner-sidebar";
import MobileHeader from "@/components/mobile-header";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import { OrgProvider } from "@/components/org-provider";
import type { CurrencyCode, ModuleId, UserRole, VerticalType } from "@/types/database";

interface Props {
  children:     React.ReactNode;
  userName:     string;
  orgName:      string;
  currency:     CurrencyCode;
  exchangeRate: number;
  vertical:     VerticalType;
  modules:      ModuleId[];
  role:         UserRole;
  topBar?:      React.ReactNode; // e.g. the active staff member bar
}

export default function AppShell({
  children, userName, orgName, currency, exchangeRate, vertical, modules, role, topBar,
}: Props) {
  return (
    <OrgProvider
      currency={currency}
      exchangeRate={exchangeRate}
      orgName={orgName}
      vertical={vertical}
      modules={modules}
    >
      <div className="min-h-screen bg-background">
        <OwnerSidebar userName={userName} orgName={orgName} modules={modules} role={role} />
        <div className="lg:pl-56">
          <MobileHeader userName={userName} orgName={orgName} modules={modules} role={role} />
          {topBar}
          <main className="p-4 sm:p-6 pb-24 lg:pb-8 min-h-screen">
            {children}
          </main>
        </div>
        <MobileBottomNav modules={modules} role={role} />
      </div>
    </OrgProvider>
  );
}
