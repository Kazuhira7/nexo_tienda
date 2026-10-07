"use client";

import { useState } from "react";
import { MinusIcon, PlusIcon, CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMoney } from "@/components/org-provider";
import AnimatedNumber from "@/components/ui/animated-number";
import type { MenuGroup, MenuItemView } from "./order-screen";

interface Props {
  item:    MenuItemView | null;
  groups:  MenuGroup[];
  onClose: () => void;
  onAdd:   (input: { quantity: number; modifierIds: string[]; notes: string }) => void;
}

// Bottom sheet to pick a dish's options (término, extras), quantity and notes.
export default function ItemSheet({ item, groups, onClose, onAdd }: Props) {
  return (
    <Sheet open={!!item} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl md:max-w-2xl md:mx-auto">
        {/* key resets the form for each dish */}
        {item && <ItemForm key={item.id} item={item} groups={groups} onAdd={onAdd} />}
      </SheetContent>
    </Sheet>
  );
}

function ItemForm({ item, groups, onAdd }: { item: MenuItemView; groups: MenuGroup[]; onAdd: Props["onAdd"] }) {
  const fmt = useMoney();
  const itemGroups = item.groupIds
    .map((gid) => groups.find((g) => g.id === gid))
    .filter((g): g is MenuGroup => !!g);

  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  function toggle(group: MenuGroup, optionId: string) {
    setSelected((prev) => {
      const current = prev[group.id] ?? [];
      if (current.includes(optionId)) return { ...prev, [group.id]: current.filter((o) => o !== optionId) };
      if (group.max_select === 1) return { ...prev, [group.id]: [optionId] };          // radio behavior
      if (current.length >= group.max_select) return prev;                             // at max
      return { ...prev, [group.id]: [...current, optionId] };
    });
  }

  const modifierIds = Object.values(selected).flat();
  const extras = itemGroups
    .flatMap((g) => g.options)
    .filter((o) => modifierIds.includes(o.id))
    .reduce((sum, o) => sum + o.price_delta, 0);
  const missing = itemGroups.filter((g) => (selected[g.id]?.length ?? 0) < g.min_select);

  return (
    <div className="px-4 pb-6 space-y-5">
      <SheetHeader className="px-0">
        <SheetTitle className="text-xl">{item.name}</SheetTitle>
        <p className="text-sm text-muted-foreground">{fmt(item.price)}</p>
      </SheetHeader>

      {itemGroups.map((g) => {
        const count = selected[g.id]?.length ?? 0;
        const rule = g.min_select > 0
          ? (g.max_select === 1 ? "Obligatorio · elige 1" : `Obligatorio · elige ${g.min_select} a ${g.max_select}`)
          : (g.max_select === 1 ? "Opcional · máximo 1" : `Opcional · hasta ${g.max_select}`);
        return (
          <div key={g.id} className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-semibold">{g.name}</p>
              <p className={`text-xs ${g.min_select > count ? "text-accent font-medium" : "text-muted-foreground"}`}>
                {rule}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {g.options.map((o) => {
                const on = selected[g.id]?.includes(o.id) ?? false;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => toggle(g, o.id)}
                    className={`min-h-14 rounded-xl border-2 px-3 py-2 text-left text-sm transition-all duration-150 active:scale-95 ${
                      on ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-1 font-medium">
                      {o.name}
                      {on && <CheckIcon className="size-4 text-primary shrink-0 animate-in zoom-in duration-200" />}
                    </span>
                    {o.price_delta !== 0 && (
                      <span className="text-xs text-muted-foreground">+{fmt(o.price_delta)}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="space-y-2">
        <p className="font-semibold">Notas</p>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={140}
          placeholder="Ej. sin cebolla, salsa aparte" />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-xl border">
          <button type="button" aria-label="Menos" onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="size-12 flex items-center justify-center active:bg-muted rounded-l-xl">
            <MinusIcon className="size-5" />
          </button>
          <span className="w-10 text-center text-lg font-semibold">{quantity}</span>
          <button type="button" aria-label="Más" onClick={() => setQuantity((q) => Math.min(99, q + 1))}
            className="size-12 flex items-center justify-center active:bg-muted rounded-r-xl">
            <PlusIcon className="size-5" />
          </button>
        </div>
        <Button
          variant="cta"
          className="flex-1 h-12 text-base font-semibold"
          disabled={missing.length > 0}
          onClick={() => onAdd({ quantity, modifierIds, notes })}
        >
          {missing.length > 0
            ? `Elige ${missing[0].name.toLowerCase()}`
            : <>Agregar · <AnimatedNumber value={quantity * (item.price + extras)} /></>}
        </Button>
      </div>
    </div>
  );
}
