// Public sales site (landing at "/"): price and sales contact live here, not in the page.
// Pure data + helpers — safe on client and server.

export const SALES = {
  /** Monthly price per business, in córdobas. */
  monthlyPriceNio: 1500,
  /** Free trial in days. Must match platform_settings.trial_days (019), which starts each new org's trial. */
  trialDays: 14,
  /** Sales WhatsApp: country code + number, digits only (e.g. "50588887777"). Empty hides the WhatsApp buttons. */
  whatsapp: "50589374127",
} as const;

/** "C$1,500" — Nicaraguan grouping, no decimals (marketing copy, not ledger amounts). */
export function formatNio(amount: number): string {
  return `C$${amount.toLocaleString("es-NI")}`;
}

/** wa.me chat link with a pre-filled message, or null while no number is configured. */
export function whatsappUrl(message: string): string | null {
  const digits = SALES.whatsapp.replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
