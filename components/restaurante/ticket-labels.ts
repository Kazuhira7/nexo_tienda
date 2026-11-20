// Plain module (no "use client") so both Server and Client Components can import it.
import type { PaymentMethod } from "@/types/database";

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash:     "Efectivo",
  pos:      "Tarjeta (POS)",
  transfer: "Transferencia",
  mixed:    "Mixto",
};
