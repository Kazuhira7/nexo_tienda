"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMoney } from "@/components/org-provider";
import { saveCashClosure } from "@/app/(owner)/caja/actions";

interface Props {
  closureDate:      string;
  openingCash:      number; // fondo inicial del día (0 si no se abrió caja)
  cashSales:        number; // ventas en efectivo del día
  expectedPos:      number;
  expectedTransfer: number;
  expectedMixed:    number;
  existing: {
    counted_cash: number;
    notes:        string | null;
  } | null;
}

export default function CashClosureForm({
  closureDate,
  openingCash,
  cashSales,
  expectedPos,
  expectedTransfer,
  expectedMixed,
  existing,
}: Props) {
  const fmt = useMoney();
  const [pending, start] = useTransition();
  const [counted, setCounted] = useState(
    existing ? String(existing.counted_cash) : ""
  );
  const [notes, setNotes] = useState(existing?.notes ?? "");

  const expectedCash = Math.round((openingCash + cashSales) * 100) / 100;
  const countedNum = parseFloat(counted || "0") || 0;
  const difference = Math.round((countedNum - expectedCash) * 100) / 100;
  const hasInput = counted.trim() !== "";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    start(async () => {
      const result = await saveCashClosure({
        closureDate,
        openingCash,
        cashSales,
        countedCash:      countedNum,
        expectedPos,
        expectedTransfer,
        expectedMixed,
        notes:            notes.trim() || null,
      });
      if (result.error) toast.error(result.error);
      else toast.success("Cierre de caja guardado");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <section className="rounded-xl border bg-card p-5 space-y-4">
        {/* Desglose de lo esperado en el cajón */}
        <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm space-y-1">
          <div className="flex justify-between"><span className="text-muted-foreground">Fondo inicial</span><span>{fmt(openingCash)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">+ Ventas en efectivo</span><span>{fmt(cashSales)}</span></div>
          <div className="flex justify-between font-semibold border-t pt-1"><span>Debe haber en caja</span><span>{fmt(expectedCash)}</span></div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="counted_cash">Efectivo contado en caja</Label>
          <Input
            id="counted_cash"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={counted}
            onChange={(e) => setCounted(e.target.value)}
            className="text-lg font-semibold"
          />
          <p className="text-xs text-muted-foreground">
            Cuenta el efectivo físico de la caja y escríbelo aquí.
          </p>
        </div>

        {/* Resultado del cuadre — solo si hay conteo */}
        {hasInput && (
          <div
            key={difference === 0 ? "ok" : "diff"}
            className={`rounded-xl border-2 p-4 flex items-center justify-between animate-in fade-in zoom-in-95 duration-200 ${
              difference === 0
                ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900"
                : "border-destructive/50 bg-destructive/5"
            }`}
          >
            <div>
              <p
                className={`font-semibold ${
                  difference === 0 ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"
                }`}
              >
                {difference === 0
                  ? "Caja cuadrada"
                  : difference > 0
                    ? "Sobrante en caja"
                    : "Faltante en caja"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Esperado {fmt(expectedCash)} · Contado {fmt(countedNum)}
              </p>
            </div>
            {difference !== 0 && (
              <p className="text-xl font-bold text-destructive">
                {difference > 0 ? "+" : "−"}
                {fmt(Math.abs(difference))}
              </p>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="notes">Nota (opcional)</Label>
          <Textarea
            id="notes"
            placeholder="Ej. faltante por vuelto, retiro de caja, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>
      </section>

      <Button
        type="submit"
        variant="cta"
        className="w-full h-11 font-semibold"
        disabled={pending || !hasInput}
      >
        {pending ? "Guardando…" : existing ? "Actualizar cierre" : "Guardar cierre"}
      </Button>
    </form>
  );
}
