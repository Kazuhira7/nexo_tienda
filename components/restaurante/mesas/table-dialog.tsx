"use client";

import { cloneElement, isValidElement, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createTablesBulk, saveTable } from "@/app/(owner)/mesas/actions";
import type { Database } from "@/types/database";

type Area  = Database["public"]["Tables"]["dining_areas"]["Row"];
type Table = Database["public"]["Tables"]["dining_tables"]["Row"];

const NO_AREA = "none";

interface Props {
  areas:          Area[];
  trigger:        React.ReactNode;
  table?:         Table;        // edit one table
  defaultAreaId?: string | null;
  nextNumber?:    number;       // suggested first number when adding
}

// Edit one table, or add several at once ("Mesa 1" … "Mesa 10").
export default function TableDialog({ areas, trigger, table, defaultAreaId, nextNumber = 1 }: Props) {
  const [open, setOpen]     = useState(false);
  const [areaId, setAreaId] = useState<string>(table?.area_id ?? defaultAreaId ?? NO_AREA);
  const [error, setError]   = useState<string | null>(null);
  const [pending, start]    = useTransition();

  const areaName = (id: string) => areas.find((a) => a.id === id)?.name ?? "Sin área";
  const defaultPrefix = (() => {
    const name = areaName(areaId).toLowerCase();
    return name.includes("kiosk") || name.includes("kiosc") ? "Kiosko" : "Mesa";
  })();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const area_id = areaId === NO_AREA ? null : areaId;
    const get = (k: string) => String(fd.get(k) ?? "");

    start(async () => {
      const result = table
        ? await saveTable(table.id, { name: get("name"), area_id, seats: get("seats"), sort_order: get("sort_order") })
        : await createTablesBulk({ area_id, prefix: get("prefix"), from: get("from"), to: get("to"), seats: get("seats") });
      if ("error" in result) {
        setError(result.error);
        toast.error(result.error);
      } else {
        setOpen(false);
        toast.success(table ? "Mesa actualizada" : "Mesas agregadas");
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
            <DialogTitle>{table ? `Editar ${table.name}` : "Agregar mesas"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Área</Label>
              <Select value={areaId} onValueChange={(v) => setAreaId(v ?? NO_AREA)}>
                <SelectTrigger className="w-full">
                  <SelectValue>{areaName(areaId)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {areas.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                  <SelectItem value={NO_AREA}>Sin área</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {table ? (
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5 col-span-3">
                  <Label htmlFor="t-name">Nombre *</Label>
                  <Input id="t-name" name="name" defaultValue={table.name} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="t-seats">Puestos</Label>
                  <Input id="t-seats" name="seats" type="number" min={1} defaultValue={table.seats} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="t-order">Orden</Label>
                  <Input id="t-order" name="sort_order" type="number" min={0} defaultValue={table.sort_order} />
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="t-prefix">Nombre base *</Label>
                  <Input id="t-prefix" name="prefix" key={defaultPrefix} defaultValue={defaultPrefix} required />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="t-from">Desde</Label>
                    <Input id="t-from" name="from" type="number" min={0} defaultValue={nextNumber} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="t-to">Hasta</Label>
                    <Input id="t-to" name="to" type="number" min={0} defaultValue={nextNumber} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="t-seats">Puestos</Label>
                    <Input id="t-seats" name="seats" type="number" min={1} defaultValue={4} required />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ej. nombre base &quot;Mesa&quot;, desde 1 hasta 10 → Mesa 1 … Mesa 10.
                </p>
              </>
            )}

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
