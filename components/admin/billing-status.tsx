import type { BillingStatus } from "@/types/database";

const STATUS: Record<BillingStatus, { label: string; className: string }> = {
  prueba:     { label: "En prueba",   className: "bg-primary/10 text-primary" },
  al_dia:     { label: "Al día",      className: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  por_vencer: { label: "Por vencer",  className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  gracia:     { label: "En gracia",   className: "bg-accent/15 text-accent" },
  vencido:    { label: "Vencido",     className: "bg-destructive/10 text-destructive" },
  suspendido: { label: "Pausado",     className: "bg-muted text-muted-foreground" },
  exento:     { label: "Sin cobro",   className: "bg-muted text-muted-foreground" },
};

/** Subscription state chip: "En prueba · 9 días", "Vencido"… */
export default function BillingStatusBadge({ status, daysLeft }: { status: BillingStatus; daysLeft: number | null }) {
  const s = STATUS[status];
  const days = daysLeft != null && ["prueba", "por_vencer", "gracia", "al_dia"].includes(status)
    ? ` · ${daysLeft === 1 ? "1 día" : `${daysLeft} días`}`
    : "";
  return <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${s.className}`}>{s.label}{days}</span>;
}

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  efectivo: "Efectivo", transferencia: "Transferencia", tarjeta: "Tarjeta", otro: "Otro",
};
