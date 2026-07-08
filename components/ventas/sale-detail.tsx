"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon, ChevronUpIcon, ReceiptIcon } from "lucide-react";
import { useMoney } from "@/components/org-provider";

type SaleItem = {
  brand_name: string;
  product_name: string;
  product_code: string;
  quantity: number;
  unit_price: number;
  discount: number;
  line_total: number;
};

interface Props {
  saleId: string;
  saleNumber: number;
  date: string;
  total: number;
  paymentMethod: string;
  customerName?: string;
  discountTotal: number;
  isCancelled: boolean;
  items: SaleItem[];
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo", pos: "POS", transfer: "Transferencia", mixed: "Mixto",
};

export default function SaleDetail({
  saleId, saleNumber, date, total, paymentMethod, customerName, discountTotal, isCancelled, items,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const money = useMoney();

  return (
    <div className={`rounded-xl border bg-card transition-all ${isCancelled ? "opacity-50" : ""}`}>
      {/* Cabecera — siempre visible */}
      <button
        className="w-full text-left p-4 flex items-center gap-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-sm">#{saleNumber}</span>
            <span className="text-muted-foreground text-xs">{date}</span>
            {customerName && <span className="text-xs text-muted-foreground">· {customerName}</span>}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant={isCancelled ? "destructive" : "outline"} className="text-xs">
              {isCancelled ? "Anulada" : PAYMENT_LABELS[paymentMethod]}
            </Badge>
            {discountTotal > 0 && (
              <span className="text-xs text-muted-foreground">−{money(discountTotal)} dto.</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`font-bold text-lg ${isCancelled ? "line-through text-muted-foreground" : ""}`}>
            {money(total)}
          </span>
          {expanded
            ? <ChevronUpIcon className="size-4 text-muted-foreground" />
            : <ChevronDownIcon className="size-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Detalle expandido */}
      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {items.length} producto{items.length !== 1 ? "s" : ""}
          </p>
          {items.map((item, i) => (
            <div key={i} className="flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium truncate">{item.product_name}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-mono">{item.product_code}</span>
                  <span className="ml-2">· {item.brand_name}</span>
                  <span className="ml-2">× {item.quantity}</span>
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold">{money(item.line_total)}</p>
                {item.discount > 0 && (
                  <p className="text-xs text-muted-foreground">−{money(item.discount)} dto.</p>
                )}
              </div>
            </div>
          ))}
          <div className="pt-2">
            <Link href={`/ventas/${saleId}`}>
              <Button variant="outline" size="sm" className="w-full gap-1.5">
                <ReceiptIcon className="size-4" /> Ver recibo
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
