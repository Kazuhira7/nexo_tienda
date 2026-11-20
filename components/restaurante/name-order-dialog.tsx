"use client";

import { cloneElement, isValidElement, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type ActionResult = { error: string } | { success: true };

interface Props {
  title:        string;
  /** Bound Server Action, e.g. saveArea.bind(null, area?.id ?? null) */
  action:       (input: { name: string; sort_order: string }) => Promise<ActionResult>;
  initial?:     { name: string; sort_order: number };
  placeholder?: string;
  orderLabel?:  string;
  successText?: string;
  trigger:      React.ReactNode;
}

// Simple "name + display order" form used for dining areas and menu categories.
export default function NameOrderDialog({
  title, action, initial, placeholder, orderLabel = "Orden", successText = "Guardado", trigger,
}: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const result = await action({
        name:       String(fd.get("name") ?? ""),
        sort_order: String(fd.get("sort_order") ?? "0"),
      });
      if ("error" in result) {
        setError(result.error);
        toast.error(result.error);
      } else {
        setOpen(false);
        toast.success(successText);
      }
    });
  }

  const triggerEl = isValidElement(trigger)
    ? cloneElement(trigger as React.ReactElement<{ onClick?: () => void }>, { onClick: () => setOpen(true) })
    : trigger;

  return (
    <>
      {triggerEl}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="no-name">Nombre *</Label>
              <Input id="no-name" name="name" defaultValue={initial?.name} placeholder={placeholder} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="no-order">{orderLabel}</Label>
              <Input id="no-order" name="sort_order" type="number" min={0} defaultValue={initial?.sort_order ?? 0} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" variant="cta" disabled={pending}>{pending ? "Guardando…" : "Guardar"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
