"use client";

import Link from "next/link";
import { MinusIcon, PlusIcon, XIcon, SendIcon, ReceiptIcon, WalletIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMoney } from "@/components/org-provider";
import type { OrderItemRow, OrderView } from "./order-screen";
import type { OrderItemStatus } from "@/types/database";

const SENT_LABEL: Partial<Record<OrderItemStatus, string>> = {
  sent:      "En cocina",
  preparing: "Preparando",
  ready:     "Listo",
  served:    "Servido",
};

interface Props {
  order:         OrderView;
  items:         OrderItemRow[];
  busy:          boolean;
  onQuantity:    (item: OrderItemRow, quantity: number) => void;
  onRemove:      (item: OrderItemRow) => void; // pending → remove; sent → void (may need supervisor)
  onSend:        () => void;
  onRequestBill: () => void;
}

export default function OrderTicket({ order, items, busy, onQuantity, onRemove, onSend, onRequestBill }: Props) {
  const fmt = useMoney();
  const open = order.status === "open";
  const pending = items.filter((i) => i.status === "pending");
  const sent = items.filter((i) => i.status !== "pending" && i.status !== "cancelled");
  const cancelled = items.filter((i) => i.status === "cancelled");
  const total = [...pending, ...sent].reduce((sum, i) => sum + i.line_total, 0);
  const pendingCount = pending.reduce((n, i) => n + i.quantity, 0);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-4">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-10">
            Toca un platillo del menú para agregarlo.
          </p>
        )}

        {pending.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-accent uppercase tracking-widest">Por enviar</p>
            {pending.map((i) => (
              <ItemLine key={i.id} item={i} fmt={fmt}>
                {open && (
                  <div className="flex items-center rounded-lg border shrink-0">
                    <button type="button" aria-label="Menos" disabled={i.optimistic}
                      onClick={() => (i.quantity > 1 ? onQuantity(i, i.quantity - 1) : onRemove(i))}
                      className="size-9 flex items-center justify-center active:bg-muted disabled:opacity-40">
                      {i.quantity > 1 ? <MinusIcon className="size-4" /> : <XIcon className="size-4 text-destructive" />}
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">{i.quantity}</span>
                    <button type="button" aria-label="Más" disabled={i.optimistic}
                      onClick={() => onQuantity(i, i.quantity + 1)}
                      className="size-9 flex items-center justify-center active:bg-muted disabled:opacity-40">
                      <PlusIcon className="size-4" />
                    </button>
                  </div>
                )}
              </ItemLine>
            ))}
          </div>
        )}

        {sent.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Enviado</p>
            {sent.map((i) => (
              <ItemLine key={i.id} item={i} fmt={fmt} showQty>
                <div className="flex items-center gap-1 shrink-0">
                  <Badge variant="secondary">{SENT_LABEL[i.status]}</Badge>
                  {open && (
                    <button type="button" aria-label="Anular platillo" title="Anular"
                      onClick={() => onRemove(i)}
                      className="p-1.5 text-muted-foreground hover:text-destructive">
                      <XIcon className="size-4" />
                    </button>
                  )}
                </div>
              </ItemLine>
            ))}
          </div>
        )}

        {cancelled.length > 0 && (
          <div className="space-y-1 opacity-60">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Anulado</p>
            {cancelled.map((i) => (
              <ItemLine key={i.id} item={i} fmt={fmt} showQty struck />
            ))}
          </div>
        )}
      </div>

      <div className="border-t pt-3 mt-3 space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-2xl font-bold">{fmt(total)}</span>
        </div>

        {open && (
          <div className="space-y-2">
            <Button variant="cta" className="w-full h-14 text-base font-semibold gap-2"
              disabled={pendingCount === 0 || busy} onClick={onSend}>
              <SendIcon className="size-5" />
              {pendingCount === 0 ? "Nada por enviar" : `Enviar a cocina (${pendingCount})`}
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-12 gap-1.5" onClick={onRequestBill}
                disabled={busy || total === 0 || order.type !== "dine_in"}>
                <ReceiptIcon className="size-4" /> Pedir cuenta
              </Button>
              <Link href={`/cobrar/${order.id}`} aria-disabled={total === 0}
                className={total === 0 ? "pointer-events-none" : ""}>
                <Button variant="outline" className="h-12 w-full gap-1.5" disabled={total === 0}>
                  <WalletIcon className="size-4" /> Cobrar
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ItemLine({
  item, fmt, children, showQty, struck,
}: {
  item:      OrderItemRow;
  fmt:       (n: number) => string;
  children?: React.ReactNode;
  showQty?:  boolean;
  struck?:   boolean;
}) {
  return (
    <div className={`flex items-center gap-2 py-2 border-b last:border-0 ${item.optimistic ? "opacity-60" : ""}`}>
      <div className={`flex-1 min-w-0 ${struck ? "line-through" : ""}`}>
        <p className="text-sm font-medium leading-tight">
          {showQty && <span className="text-muted-foreground">{item.quantity}× </span>}
          {item.item_name}
        </p>
        {item.modifiers.length > 0 && (
          <p className="text-xs text-muted-foreground">{item.modifiers.map((m) => m.name).join(" · ")}</p>
        )}
        {item.notes && <p className="text-xs font-medium text-accent">“{item.notes}”</p>}
        <p className="text-xs text-muted-foreground">{fmt(item.line_total)}</p>
      </div>
      {children}
    </div>
  );
}
