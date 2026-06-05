"use client";

import { cloneElement, isValidElement, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { adjustStock } from "@/app/(owner)/inventario/stock-actions";

interface Props {
  productId: string;
  productName: string;
  currentStock: number;
  trigger: React.ReactNode;
}

export default function StockDialog({
  productId, productName, currentStock, trigger,
}: Props) {
  const [open, setOpen] = useState(false);
  const [delta, setDelta] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const preview = delta !== "" ? currentStock + (parseInt(delta) || 0) : currentStock;
  const isNegative = preview < 0;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await adjustStock(productId, formData);
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        toast.success(`Stock actualizado: ${result.newQty} unidades`);
        setOpen(false);
        setDelta("");
      }
    });
  }

  const triggerEl = isValidElement(trigger)
    ? cloneElement(trigger as React.ReactElement<{ onClick?: () => void }>, {
        onClick: () => setOpen(true),
      })
    : trigger;

  return (
    <>
      {triggerEl}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ajustar stock</DialogTitle>
          </DialogHeader>

          <div className="text-sm text-muted-foreground mb-1">
            <span className="font-medium text-foreground">{productName}</span>
            <span className="ml-2">· Stock actual: <strong>{currentStock}</strong></span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="delta">
                Cantidad a ajustar
                <span className="text-muted-foreground font-normal ml-1">
                  (positivo para entrada, negativo para salida)
                </span>
              </Label>
              <Input
                id="delta"
                name="delta"
                type="number"
                placeholder="Ej. +10 o -3"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                autoFocus
                required
              />
            </div>

            {delta !== "" && (
              <div className={`rounded-md px-3 py-2 text-sm font-medium ${
                isNegative
                  ? "bg-destructive/10 text-destructive"
                  : "bg-muted text-foreground"
              }`}>
                Stock resultante: <strong>{preview}</strong> unidades
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="default"
                disabled={pending || isNegative || delta === ""}
              >
                {pending ? "Guardando…" : "Confirmar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
