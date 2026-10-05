"use client";

import { PrinterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

// 80 mm thermal ticket printing from the browser (window.print + @media print).
// Only the element with [data-print-ticket] is printed, and the 80 mm @page rule
// is injected just for this print so other printable pages (A4 receipts) are unaffected.

export function printTicket() {
  const style = document.createElement("style");
  style.textContent = "@page { size: 80mm auto; margin: 3mm; }";
  document.head.appendChild(style);
  document.body.classList.add("printing-ticket");
  const cleanup = () => {
    document.body.classList.remove("printing-ticket");
    style.remove();
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.print();
}

export function PrintTicketButton({ label = "Imprimir", className }: { label?: string; className?: string }) {
  return (
    <Button type="button" variant="outline" className={`gap-1.5 ${className ?? ""}`} onClick={printTicket}>
      <PrinterIcon className="size-4" /> {label}
    </Button>
  );
}
