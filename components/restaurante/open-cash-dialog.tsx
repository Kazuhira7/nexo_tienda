"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMoney } from "@/components/org-provider";
import { useStaffAction } from "@/components/staff/use-staff-action";
import { openCashFromFloor } from "@/app/(restaurante)/caja-actions";

const QUICK = [0, 500, 1000, 2000];

// "Abrir caja" from the floor (salón / cobrar): needs payments.collect or a supervisor PIN.
export default function OpenCashDialog({
  open, onOpenChange,
}: {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const fmt = useMoney();
  const { run, pending, authDialog } = useStaffAction();
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount) || 0;
    run((pin) => openCashFromFloor(value, notes, pin), {
      onSuccess: () => {
        onOpenChange(false);
        setAmount("");
        setNotes("");
        toast.success(`Caja abierta con ${fmt(value)}`);
      },
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Abrir caja</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="cash-amount">Fondo inicial (C$)</Label>
              <Input id="cash-amount" type="number" inputMode="decimal" step="0.01" min="0" autoFocus
                value={amount} onChange={(e) => setAmount(e.target.value)} className="h-12 text-lg font-semibold"
                placeholder="Efectivo con el que empieza el día" />
              <div className="flex flex-wrap gap-2 pt-1">
                {QUICK.map((q) => (
                  <button key={q} type="button" onClick={() => setAmount(String(q))}
                    className={`h-9 px-3 rounded-full border text-sm font-medium transition-all active:scale-95 ${
                      amount !== "" && Number(amount) === q ? "border-primary bg-primary/10 text-primary" : "bg-card hover:bg-muted"
                    }`}>
                    {fmt(q)}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cash-notes">Nota (opcional)</Label>
              <Input id="cash-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={200} />
            </div>
            <p className="text-xs text-muted-foreground">Requiere permiso para cobrar.</p>
            <Button type="submit" variant="cta" className="w-full h-12 text-base" disabled={amount === "" || pending}>
              {pending ? "Abriendo…" : "Abrir caja"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      {authDialog}
    </>
  );
}
