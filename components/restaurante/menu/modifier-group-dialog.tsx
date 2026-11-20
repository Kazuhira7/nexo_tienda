"use client";

import { cloneElement, isValidElement, useState, useTransition } from "react";
import { toast } from "sonner";
import { PlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { saveModifierGroup } from "@/app/(owner)/menu/actions";
import type { Database } from "@/types/database";

type Group    = Database["public"]["Tables"]["modifier_groups"]["Row"];
type Modifier = Database["public"]["Tables"]["modifiers"]["Row"];

interface OptionRow {
  key:         string;
  id?:         string;
  name:        string;
  price_delta: string;
}

let keySeq = 0;
const newKey = () => `opt-${++keySeq}`;

interface Props {
  trigger:  React.ReactNode;
  group?:   Group;
  options?: Modifier[];
}

// Extras / options group: "Extras" (optional, several, with price) or
// "Término" (required, pick one). Each option may add to the price.
export default function ModifierGroupDialog({ trigger, group, options = [] }: Props) {
  const [open, setOpen]         = useState(false);
  const [name, setName]         = useState(group?.name ?? "");
  const [required, setRequired] = useState((group?.min_select ?? 0) > 0);
  const [max, setMax]           = useState(String(group?.max_select ?? 1));
  const [rows, setRows]         = useState<OptionRow[]>(
    options.length
      ? options.map((o) => ({ key: newKey(), id: o.id, name: o.name, price_delta: String(o.price_delta) }))
      : [{ key: newKey(), name: "", price_delta: "0" }]
  );
  const [error, setError]       = useState<string | null>(null);
  const [pending, start]        = useTransition();

  function updateRow(key: string, patch: Partial<OptionRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const result = await saveModifierGroup(group?.id ?? null, {
        name,
        min_select: required ? 1 : 0,
        max_select: max,
        options:    rows.map((r) => ({ id: r.id, name: r.name, price_delta: r.price_delta || "0" })),
      });
      if ("error" in result) {
        setError(result.error);
        toast.error(result.error);
      } else {
        setOpen(false);
        toast.success(group ? "Extras actualizados" : "Extras creados");
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
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{group ? "Editar extras / opciones" : "Nuevos extras / opciones"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="mg-name">Nombre del grupo *</Label>
              <Input id="mg-name" value={name} onChange={(e) => setName(e.target.value)}
                placeholder='Ej. "Extras", "Término de la carne"' required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2 cursor-pointer">
                <span className="text-sm">Obligatorio</span>
                <Switch checked={required} onCheckedChange={setRequired} />
              </label>
              <div className="space-y-1">
                <Label htmlFor="mg-max" className="text-xs">Máximo que puede elegir</Label>
                <Input id="mg-max" type="number" min={1} value={max} onChange={(e) => setMax(e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              {required
                ? `El mesero debe elegir entre 1 y ${max || 1} opción(es).`
                : `Opcional: puede no elegir nada o hasta ${max || 1}.`}
            </p>

            <div className="space-y-2">
              <Label>Opciones</Label>
              {rows.map((r) => (
                <div key={r.key} className="flex items-center gap-2">
                  <Input value={r.name} onChange={(e) => updateRow(r.key, { name: e.target.value })}
                    placeholder="Ej. Extra queso" className="flex-1" required />
                  <div className="relative w-28 shrink-0">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">+C$</span>
                    <Input value={r.price_delta} onChange={(e) => updateRow(r.key, { price_delta: e.target.value })}
                      type="number" step="0.01" inputMode="decimal" className="pl-10" aria-label="Precio adicional" />
                  </div>
                  <button type="button" aria-label="Quitar opción" disabled={rows.length === 1}
                    onClick={() => setRows((prev) => prev.filter((x) => x.key !== r.key))}
                    className="p-1.5 text-muted-foreground hover:text-destructive disabled:opacity-30">
                    <XIcon className="size-4" />
                  </button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="gap-1"
                onClick={() => setRows((prev) => [...prev, { key: newKey(), name: "", price_delta: "0" }])}>
                <PlusIcon className="size-3.5" /> Opción
              </Button>
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
