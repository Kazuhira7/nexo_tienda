"use client";

import { cloneElement, isValidElement, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { saveMenuItem } from "@/app/(owner)/menu/actions";
import type { Database, PrepStation } from "@/types/database";

type Category  = Database["public"]["Tables"]["menu_categories"]["Row"];
type MenuItem  = Database["public"]["Tables"]["menu_items"]["Row"];
type Group     = Database["public"]["Tables"]["modifier_groups"]["Row"];

const NO_CATEGORY = "none";
const STATIONS: Record<PrepStation, string> = { kitchen: "Cocina", bar: "Barra / bebidas" };

interface Props {
  categories:         Category[];
  groups:             Group[];
  trigger:            React.ReactNode;
  item?:              MenuItem;
  itemGroupIds?:      string[];
  defaultCategoryId?: string | null;
}

export default function MenuItemDialog({
  categories, groups, trigger, item, itemGroupIds = [], defaultCategoryId,
}: Props) {
  const [open, setOpen]         = useState(false);
  const [categoryId, setCatId]  = useState<string>(item?.category_id ?? defaultCategoryId ?? NO_CATEGORY);
  const [station, setStation]   = useState<PrepStation>(item?.prep_station ?? "kitchen");
  const [active, setActive]     = useState(item?.active ?? true);
  const [groupIds, setGroupIds] = useState<string[]>(itemGroupIds);
  const [error, setError]       = useState<string | null>(null);
  const [pending, start]        = useTransition();

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? "Sin categoría";

  function toggleGroup(id: string, on: boolean) {
    setGroupIds((prev) => (on ? [...prev, id] : prev.filter((g) => g !== id)));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? "").trim();

    start(async () => {
      const result = await saveMenuItem(item?.id ?? null, {
        name:         get("name"),
        category_id:  categoryId === NO_CATEGORY ? null : categoryId,
        price:        get("price"),
        cost:         get("cost") === "" ? null : get("cost"),
        description:  get("description") || null,
        prep_station: station,
        active,
        sort_order:   get("sort_order") || "0",
        group_ids:    groupIds,
      });
      if ("error" in result) {
        setError(result.error);
        toast.error(result.error);
      } else {
        setOpen(false);
        toast.success(item ? "Platillo actualizado" : "Platillo agregado");
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
            <DialogTitle>{item ? "Editar platillo" : "Nuevo platillo"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="mi-name">Nombre *</Label>
              <Input id="mi-name" name="name" defaultValue={item?.name} placeholder="Ej. Churrasco" required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Categoría</Label>
                <Select value={categoryId} onValueChange={(v) => setCatId(v ?? NO_CATEGORY)}>
                  <SelectTrigger className="w-full"><SelectValue>{categoryName(categoryId)}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    <SelectItem value={NO_CATEGORY}>Sin categoría</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Se prepara en</Label>
                <Select value={station} onValueChange={(v) => setStation((v as PrepStation) ?? "kitchen")}>
                  <SelectTrigger className="w-full"><SelectValue>{STATIONS[station]}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATIONS) as PrepStation[]).map((s) => (
                      <SelectItem key={s} value={s}>{STATIONS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mi-price">Precio (C$) *</Label>
                <Input id="mi-price" name="price" type="number" step="0.01" min={0} inputMode="decimal"
                  defaultValue={item?.price} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mi-cost">Costo (C$)</Label>
                <Input id="mi-cost" name="cost" type="number" step="0.01" min={0} inputMode="decimal"
                  defaultValue={item?.cost ?? ""} placeholder="Opcional" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mi-order">Orden</Label>
                <Input id="mi-order" name="sort_order" type="number" min={0} defaultValue={item?.sort_order ?? 0} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">El costo solo lo ves tú; sirve para saber tu ganancia.</p>

            <div className="space-y-1.5">
              <Label htmlFor="mi-desc">Descripción</Label>
              <Textarea id="mi-desc" name="description" rows={2} defaultValue={item?.description ?? ""}
                placeholder="Opcional — ej. acompañado de gallo pinto y tajadas" />
            </div>

            <div className="space-y-2">
              <Label>Extras y opciones</Label>
              {groups.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Aún no hay extras. Créalos en la sección &quot;Extras y opciones&quot; del menú.
                </p>
              ) : (
                <div className="rounded-xl border divide-y">
                  {groups.map((g) => (
                    <label key={g.id} className="flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer">
                      <span className="text-sm">{g.name}</span>
                      <Switch checked={groupIds.includes(g.id)} onCheckedChange={(on) => toggleGroup(g.id, on)} />
                    </label>
                  ))}
                </div>
              )}
            </div>

            <label className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 cursor-pointer">
              <span className="min-w-0">
                <span className="block text-sm font-medium">Activo</span>
                <span className="block text-xs text-muted-foreground">Si lo apagas, desaparece del menú del salón</span>
              </span>
              <Switch checked={active} onCheckedChange={setActive} />
            </label>

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
