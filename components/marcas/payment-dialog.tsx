"use client";

import { cloneElement, isValidElement, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { createBrandPayment } from "@/app/(owner)/marcas/[brandId]/actions";
import type { BrandPaymentType, PaymentMethod } from "@/types/database";

const TYPES: { value: BrandPaymentType; label: string; hint: string }[] = [
  { value: "payout",      label: "Pago a la marca",  hint: "Le pagas a la marca lo vendido" },
  { value: "fee_charge",  label: "Cargar cuota",     hint: "Registras una cuota a cobrar" },
  { value: "fee_payment", label: "Cuota recibida",   hint: "La marca te pagó su cuota" },
];

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash",     label: "Efectivo" },
  { value: "pos",      label: "POS" },
  { value: "transfer", label: "Transferencia" },
];

interface Props {
  brandId:   string;
  spaceFee:  number;
  trigger:   React.ReactNode;
}

export default function PaymentDialog({ brandId, spaceFee, trigger }: Props) {
  const [open, setOpen]       = useState(false);
  const [pending, start]      = useTransition();
  const [type, setType]       = useState<BrandPaymentType>("payout");
  const [amount, setAmount]   = useState("");
  const [method, setMethod]   = useState<PaymentMethod>("cash");
  const [date, setDate]       = useState(() => new Date().toISOString().split("T")[0]);
  const [notes, setNotes]     = useState("");

  function chooseType(t: BrandPaymentType) {
    setType(t);
    // Prellenar el monto con la cuota de la marca al cargar cuota
    if (t === "fee_charge" && spaceFee > 0 && amount === "") {
      setAmount(String(spaceFee));
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const amountNum = parseFloat(amount || "0") || 0;
    start(async () => {
      const result = await createBrandPayment({
        brandId,
        type,
        amount:     amountNum,
        method:     type === "fee_charge" ? null : method,
        occurredOn: date,
        notes:      notes.trim() || null,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Movimiento registrado");
        setOpen(false);
        setAmount(""); setNotes(""); setType("payout"); setMethod("cash");
        setDate(new Date().toISOString().split("T")[0]);
      }
    });
  }

  const triggerEl = isValidElement(trigger)
    ? cloneElement(trigger as React.ReactElement<{ onClick?: () => void }>, {
        onClick: () => setOpen(true),
      })
    : trigger;

  const showMethod = type !== "fee_charge";

  return (
    <>
      {triggerEl}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar movimiento</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {/* Tipo de movimiento */}
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <div className="grid grid-cols-1 gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => chooseType(t.value)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      type === t.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <p className="font-semibold text-sm">{t.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.hint}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Monto */}
            <div className="space-y-1.5">
              <Label htmlFor="amount">Monto (C$)</Label>
              <Input
                id="amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-lg font-semibold"
                required
              />
            </div>

            {/* Método (solo movimientos de dinero) */}
            {showMethod && (
              <div className="space-y-1.5">
                <Label>Método de pago</Label>
                <div className="grid grid-cols-3 gap-2">
                  {METHODS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setMethod(m.value)}
                      className={`p-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                        method === m.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Fecha */}
            <div className="space-y-1.5">
              <Label htmlFor="occurred_on">Fecha</Label>
              <Input
                id="occurred_on"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            {/* Notas */}
            <div className="space-y-1.5">
              <Label htmlFor="notes">Nota (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Ej. transferencia BAC, quincena 1, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="cta" disabled={pending}>
                {pending ? "Guardando…" : "Registrar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
