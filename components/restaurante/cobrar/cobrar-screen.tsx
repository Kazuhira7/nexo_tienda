"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeftIcon, BanknoteIcon, CreditCardIcon, ArrowLeftRightIcon, CheckCircle2Icon, PercentIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMoney } from "@/components/org-provider";
import { useStaffAction } from "@/components/staff/use-staff-action";
import Ticket, { type TicketItem, type TicketPayment } from "@/components/restaurante/ticket";
import { PrintTicketButton } from "@/components/restaurante/print-ticket";
import { applyDiscount, payOrder } from "@/app/(restaurante)/cobrar/actions";
import type { TicketInfo } from "@/lib/org-context";

type Method = "cash" | "pos" | "transfer";

const METHODS: { id: Method; label: string; icon: typeof BanknoteIcon }[] = [
  { id: "cash",     label: "Efectivo",      icon: BanknoteIcon },
  { id: "pos",      label: "Tarjeta (POS)", icon: CreditCardIcon },
  { id: "transfer", label: "Transferencia", icon: ArrowLeftRightIcon },
];
const BILLS = [100, 200, 500, 1000];
const round2 = (n: number) => Math.round(n * 100) / 100;

interface Props {
  order: {
    id:       string;
    number:   number;
    title:    string;
    status:   "open" | "paid" | "cancelled";
    discount: number;
  };
  items:    TicketItem[];
  payments: TicketPayment[];
  business: TicketInfo;
}

export default function CobrarScreen({ order, items, payments, business }: Props) {
  const router = useRouter();
  const fmt = useMoney();
  const { run, pending, authDialog } = useStaffAction();

  const subtotal = round2(items.reduce((s, i) => s + i.line_total, 0));
  const total = round2(subtotal - order.discount);
  const paid = round2(payments.reduce((s, p) => s + p.amount, 0));
  const balance = round2(total - paid);
  const closed = order.status !== "open";

  const [method, setMethod] = useState<Method>("cash");
  const [amount, setAmount] = useState(String(balance));
  const [received, setReceived] = useState("");
  const [byItems, setByItems] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [discountValue, setDiscountValue] = useState("");
  const [discountPct, setDiscountPct] = useState(false);
  const [lastBalance, setLastBalance] = useState(balance);

  // Server data changed (another payment landed): reset the suggested amount
  if (lastBalance !== balance) {
    setLastBalance(balance);
    setAmount(String(balance));
    setPicked([]);
    setReceived("");
  }

  const amountNum = round2(Number(amount) || 0);
  const receivedNum = Number(received) || 0;
  const change = method === "cash" && receivedNum > 0 ? round2(receivedNum - amountNum) : null;

  function split(parts: number) {
    setByItems(false);
    setAmount(String(round2(balance / parts)));
  }

  function togglePick(item: TicketItem) {
    const next = picked.includes(item.id) ? picked.filter((p) => p !== item.id) : [...picked, item.id];
    setPicked(next);
    const sum = items.filter((i) => next.includes(i.id)).reduce((s, i) => s + i.line_total, 0);
    setAmount(String(round2(Math.min(sum, balance))));
  }

  function pay() {
    if (amountNum <= 0 || amountNum > balance) {
      toast.error(`El monto debe ser entre ${fmt(0.01)} y ${fmt(balance)}`);
      return;
    }
    if (change !== null && change < 0) {
      toast.error("El efectivo recibido no alcanza");
      return;
    }
    run((pin) => payOrder(order.id, amountNum, method, pin), {
      onSuccess: (remaining) => {
        if (remaining === 0) toast.success("Cuenta cerrada. ¡Listo!");
        else toast.success(`Pago registrado. Falta ${fmt(remaining)}`);
      },
    });
  }

  function saveDiscount(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(discountValue) || 0;
    const discount = round2(discountPct ? (subtotal * value) / 100 : value);
    run((pin) => applyDiscount(order.id, discount, pin), {
      onSuccess: () => {
        setDiscountOpen(false);
        toast.success(discount > 0 ? `Descuento de ${fmt(discount)} aplicado` : "Descuento quitado");
      },
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 print:hidden">
        <Link href={closed ? "/salon" : `/orden/${order.id}`} aria-label="Volver"
          className="size-11 rounded-xl border flex items-center justify-center shrink-0 active:bg-muted">
          <ArrowLeftIcon className="size-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl font-bold truncate">Cobrar · {order.title}</h1>
          <p className="text-xs text-muted-foreground">Orden #{order.number}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start">
        {/* ── Pre-cuenta / recibo ── */}
        <div className="space-y-2">
          <Ticket
            kind={closed ? "recibo" : "precuenta"}
            title={order.title}
            number={order.number}
            items={items}
            subtotal={subtotal}
            discount={order.discount}
            payments={payments}
            business={business}
          />
          <PrintTicketButton label={closed ? "Imprimir recibo" : "Imprimir pre-cuenta"} className="w-full h-11" />
        </div>

        {/* ── Panel de pago ── */}
        {closed ? (
          <div className="rounded-2xl border bg-card p-6 text-center space-y-3 print:hidden">
            <CheckCircle2Icon className="size-12 text-primary mx-auto" />
            <p className="text-lg font-semibold">
              {order.status === "paid" ? "Cuenta pagada" : "Orden cancelada"}
            </p>
            <Button variant="cta" className="w-full h-12" onClick={() => router.push("/salon")}>
              Volver al salón
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border bg-card p-4 space-y-5 print:hidden">
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">{paid > 0 ? "Saldo pendiente" : "Total a cobrar"}</p>
                <p className="text-3xl font-bold">{fmt(balance)}</p>
              </div>
              {paid === 0 && (
                <Button variant="ghost" size="sm" className="gap-1" onClick={() => setDiscountOpen(true)}>
                  <PercentIcon className="size-3.5" /> {order.discount > 0 ? "Cambiar descuento" : "Descuento"}
                </Button>
              )}
            </div>

            {/* Dividir */}
            <div className="space-y-2">
              <Label>Dividir cuenta</Label>
              <div className="flex flex-wrap gap-2">
                <Chip on={!byItems && amountNum === balance} onClick={() => split(1)}>Todo</Chip>
                {[2, 3, 4].map((n) => (
                  <Chip key={n} on={!byItems && amountNum === round2(balance / n) && amountNum !== balance}
                    onClick={() => split(n)}>
                    Entre {n}
                  </Chip>
                ))}
                <Chip on={byItems} onClick={() => { setByItems(!byItems); setPicked([]); }}>Por platillos</Chip>
              </div>
              {byItems && (
                <div className="rounded-xl border divide-y max-h-56 overflow-y-auto">
                  {items.map((i) => (
                    <label key={i.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer">
                      <input type="checkbox" className="size-5 accent-[var(--primary)]"
                        checked={picked.includes(i.id)} onChange={() => togglePick(i)} />
                      <span className="flex-1 text-sm">{i.quantity} {i.item_name}</span>
                      <span className="text-sm text-muted-foreground">{fmt(i.line_total)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Método */}
            <div className="space-y-2">
              <Label>Método de pago</Label>
              <div className="grid grid-cols-3 gap-2">
                {METHODS.map(({ id, label, icon: Icon }) => (
                  <button key={id} type="button" onClick={() => setMethod(id)}
                    className={`h-16 rounded-xl border-2 flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
                      method === id ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                    }`}>
                    <Icon className="size-5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Monto */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pay-amount">Monto de este pago (C$)</Label>
                <Input id="pay-amount" type="number" inputMode="decimal" step="0.01" min={0} max={balance}
                  value={amount} onChange={(e) => setAmount(e.target.value)} className="h-12 text-lg font-semibold" />
              </div>
              {method === "cash" && (
                <div className="space-y-1.5">
                  <Label htmlFor="pay-received">Recibido (C$)</Label>
                  <Input id="pay-received" type="number" inputMode="decimal" step="0.01" min={0}
                    value={received} onChange={(e) => setReceived(e.target.value)} placeholder="Opcional"
                    className="h-12 text-lg" />
                </div>
              )}
            </div>
            {method === "cash" && (
              <div className="flex flex-wrap gap-2 -mt-2">
                <Chip on={receivedNum === amountNum} onClick={() => setReceived(String(amountNum))}>Exacto</Chip>
                {BILLS.filter((b) => b >= amountNum).slice(0, 3).map((b) => (
                  <Chip key={b} on={receivedNum === b} onClick={() => setReceived(String(b))}>C${b}</Chip>
                ))}
              </div>
            )}
            {change !== null && (
              <div className={`rounded-xl px-4 py-3 flex items-center justify-between ${
                change < 0 ? "bg-destructive/10 text-destructive" : "bg-primary/10"
              }`}>
                <span className="text-sm font-medium">{change < 0 ? "Falta" : "Vuelto"}</span>
                <span className="text-2xl font-bold">{fmt(Math.abs(change))}</span>
              </div>
            )}

            <Button variant="cta" className="w-full h-14 text-base font-semibold" onClick={pay}
              disabled={pending || amountNum <= 0 || amountNum > balance}>
              {pending ? "Cobrando…" : amountNum === balance ? `Cobrar ${fmt(amountNum)}` : `Cobrar ${fmt(amountNum)} (parcial)`}
            </Button>
          </div>
        )}
      </div>

      <Dialog open={discountOpen} onOpenChange={setDiscountOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Descuento</DialogTitle></DialogHeader>
          <form onSubmit={saveDiscount} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-2">
              <Chip on={!discountPct} onClick={() => setDiscountPct(false)}>Monto (C$)</Chip>
              <Chip on={discountPct} onClick={() => setDiscountPct(true)}>Porcentaje (%)</Chip>
            </div>
            <Input type="number" inputMode="decimal" step="0.01" min={0} max={discountPct ? 100 : subtotal}
              value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} autoFocus
              placeholder={discountPct ? "Ej. 10" : "Ej. 50"} className="h-12 text-lg" />
            <p className="text-xs text-muted-foreground">
              Requiere permiso para aplicar descuentos. Pon 0 para quitarlo.
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDiscountOpen(false)}>Cancelar</Button>
              <Button type="submit" variant="cta" disabled={pending || discountValue === ""}>Aplicar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {authDialog}
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`h-10 px-4 rounded-full border text-sm font-medium transition-colors ${
        on ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
      }`}>
      {children}
    </button>
  );
}
