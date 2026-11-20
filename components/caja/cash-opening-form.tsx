"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { LockOpenIcon, PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMoney } from "@/components/org-provider";
import { openCashDrawer } from "@/app/(owner)/caja/actions";

const QUICK = [0, 500, 1000, 2000];

interface Props {
  opening: {
    opening_cash: number;
    notes:        string | null;
    openedAt:     string;   // formatted local time
    openedBy:     string | null;
  } | null;
  closed: boolean; // today's closure already saved → no more corrections
}

// "Abrir caja": starting float of the day. Once opened, shows who/when and allows a correction.
export default function CashOpeningForm({ opening, closed }: Props) {
  const fmt = useMoney();
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(opening ? String(opening.opening_cash) : "");
  const [notes, setNotes] = useState(opening?.notes ?? "");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const result = await openCashDrawer({ openingCash: Number(amount) || 0, notes: notes.trim() || null });
      if (result.error) toast.error(result.error);
      else {
        toast.success(opening ? "Fondo corregido" : "Caja abierta");
        setEditing(false);
      }
    });
  }

  if (opening && !editing) {
    return (
      <section className="rounded-xl border bg-card p-5 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center gap-3 min-w-0">
          <span className="size-10 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
            <LockOpenIcon className="size-5 text-emerald-600" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold">Caja abierta · fondo {fmt(opening.opening_cash)}</p>
            <p className="text-xs text-muted-foreground truncate">
              {opening.openedAt}{opening.openedBy && ` · ${opening.openedBy}`}{opening.notes && ` · ${opening.notes}`}
            </p>
          </div>
        </div>
        {!closed && (
          <Button variant="ghost" size="sm" className="gap-1 shrink-0" onClick={() => setEditing(true)}>
            <PencilIcon className="size-3.5" /> Corregir
          </Button>
        )}
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-xl border-2 border-primary/40 bg-primary/5 p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h2 className="font-semibold flex items-center gap-2">
          <LockOpenIcon className="size-4 text-primary" /> {opening ? "Corregir fondo inicial" : "Abrir caja"}
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Cuenta el efectivo con el que empiezas el día (para dar vuelto). Al cerrar se suma a las ventas en efectivo.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="opening_cash">Fondo inicial (C$)</Label>
        <Input id="opening_cash" type="number" inputMode="decimal" step="0.01" min="0" placeholder="0.00"
          value={amount} onChange={(e) => setAmount(e.target.value)} className="text-lg font-semibold h-12" autoFocus />
        <div className="flex flex-wrap gap-2 pt-1">
          {QUICK.map((q) => (
            <button key={q} type="button" onClick={() => setAmount(String(q))}
              className={`h-9 px-3 rounded-full border text-sm font-medium transition-all active:scale-95 ${
                Number(amount) === q && amount !== "" ? "border-primary bg-primary/10 text-primary" : "bg-card hover:bg-muted"
              }`}>
              {fmt(q)}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="opening_notes">Nota (opcional)</Label>
        <Input id="opening_notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={200}
          placeholder="Ej. 4 billetes de 100 y monedas" />
      </div>
      <div className="flex gap-2">
        {opening && (
          <Button type="button" variant="outline" className="h-11" onClick={() => setEditing(false)}>Cancelar</Button>
        )}
        <Button type="submit" variant="cta" className="flex-1 h-11 font-semibold" disabled={pending || amount === ""}>
          {pending ? "Guardando…" : opening ? "Guardar corrección" : "Abrir caja"}
        </Button>
      </div>
    </form>
  );
}
