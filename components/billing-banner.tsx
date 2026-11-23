import { ClockIcon, MessageCircleIcon } from "lucide-react";
import { billingNotice } from "@/lib/org-access";
import { SALES } from "@/lib/site";
import type { OrgAccess } from "@/types/database";

// Owner-only strip while the trial runs or the monthly payment is about to lapse.
export default function BillingBanner({ access }: { access: OrgAccess | null }) {
  const notice = billingNotice(access);
  if (!notice || !access) return null;

  const number = (access.sales_whatsapp || SALES.whatsapp).replace(/\D/g, "");
  const wa = number
    ? `https://wa.me/${number}?text=${encodeURIComponent(`Hola, quiero activar nexo para "${access.org_name}".`)}`
    : null;

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-4 sm:px-6 py-2 text-sm border-b ${
      notice.tone === "warn" ? "bg-accent/15 text-foreground" : "bg-primary/10 text-foreground"
    }`}>
      <ClockIcon className={`size-4 shrink-0 ${notice.tone === "warn" ? "text-accent" : "text-primary"}`} />
      <span className="font-medium">{notice.text}</span>
      {wa && (
        <a href={wa} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
          <MessageCircleIcon className="size-3.5" />
          Activar mensualidad
        </a>
      )}
    </div>
  );
}
