"use client";

import { useMoney, useOrg } from "@/components/org-provider";
import { METHOD_LABEL } from "@/components/restaurante/ticket-labels";
import type { OrderItemModifier, PaymentMethod } from "@/types/database";
import type { TicketInfo } from "@/lib/org-context";

export interface TicketItem {
  id:         string;
  item_name:  string;
  quantity:   number;
  line_total: number;
  modifiers:  OrderItemModifier[];
}

export interface TicketPayment {
  payment_method: PaymentMethod;
  amount:         number;
  created_at:     string;
}

interface Props {
  kind:      "precuenta" | "recibo";
  title:     string;  // "Mesa 3" / "Para llevar — Ana"
  number:    number;
  items:     TicketItem[];
  subtotal:  number;
  discount:  number;
  payments:  TicketPayment[];
  business?: TicketInfo;
}

// Pre-bill / receipt laid out for an 80 mm thermal printer (also readable on screen).
export default function Ticket({ kind, title, number, items, subtotal, discount, payments, business }: Props) {
  const fmt = useMoney();
  const { orgName } = useOrg();
  const total = subtotal - discount;
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  const now = new Date().toLocaleString("es-NI", { dateStyle: "short", timeStyle: "short" });

  return (
    <div data-print-ticket className="rounded-xl border bg-white text-neutral-900 p-4 font-mono text-[13px] leading-snug">
      <div className="text-center space-y-0.5">
        <p className="font-bold text-base">{orgName}</p>
        {business?.address && <p className="text-xs">{business.address}</p>}
        {(business?.phone || business?.taxId) && (
          <p className="text-xs">
            {business.phone && `Tel. ${business.phone}`}
            {business.phone && business.taxId && " · "}
            {business.taxId && `RUC ${business.taxId}`}
          </p>
        )}
        <p className="pt-1">{kind === "precuenta" ? "PRE-CUENTA" : "RECIBO"}</p>
        <p>{title} · Orden #{number}</p>
        <p className="text-neutral-500">{now}</p>
      </div>

      <div className="my-3 border-t border-dashed border-neutral-400" />

      <div className="space-y-1.5">
        {items.map((i) => (
          <div key={i.id}>
            <div className="flex justify-between gap-2">
              <span>{i.quantity} {i.item_name}</span>
              <span className="shrink-0">{fmt(i.line_total)}</span>
            </div>
            {i.modifiers.length > 0 && (
              <p className="pl-3 text-neutral-500 text-xs">{i.modifiers.map((m) => m.name).join(", ")}</p>
            )}
          </div>
        ))}
      </div>

      <div className="my-3 border-t border-dashed border-neutral-400" />

      <div className="space-y-0.5">
        <Row label="Subtotal" value={fmt(subtotal)} />
        {discount > 0 && <Row label="Descuento" value={`-${fmt(discount)}`} />}
        <Row label="TOTAL" value={fmt(total)} bold />
        {payments.map((p, idx) => (
          <Row key={idx} label={`Pago ${METHOD_LABEL[p.payment_method]}`} value={fmt(p.amount)} />
        ))}
        {payments.length > 0 && paid < total && <Row label="Saldo" value={fmt(total - paid)} bold />}
      </div>

      <div className="my-3 border-t border-dashed border-neutral-400" />
      <p className="text-center">{business?.footer || "¡Gracias por su visita!"}</p>
      {kind === "precuenta" && <p className="text-center text-xs text-neutral-500">Este no es un comprobante de pago</p>}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-2 ${bold ? "font-bold" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
