"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBagIcon, UsersIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMoney } from "@/components/org-provider";
import { useStaffAction } from "@/components/staff/use-staff-action";
import Elapsed from "@/components/restaurante/elapsed";
import { openTable, openTakeaway } from "@/app/(restaurante)/orden/actions";
import type { OrderType, TableStatus } from "@/types/database";

export interface SalonOrder {
  id:       string;
  tableId:  string | null;
  type:     OrderType;
  number:   number;
  openedAt: string;
  guests:   number;
  name:     string | null;
  waiter:   string | null;
  total:    number;
  pending:  number; // items not sent to the kitchen yet
}

export interface SalonTable {
  id:      string;
  name:    string;
  seats:   number;
  status:  TableStatus;
  area_id: string | null;
  order:   SalonOrder | null;
}

// Color + text, never color alone
const STATUS: Record<TableStatus, { label: string; card: string; dot: string }> = {
  free:           { label: "Libre",         card: "bg-card border-border",                 dot: "bg-muted-foreground/40" },
  occupied:       { label: "Ocupada",       card: "bg-primary/10 border-primary/60",       dot: "bg-primary" },
  bill_requested: { label: "Cuenta pedida", card: "bg-accent/15 border-accent",            dot: "bg-accent" },
};

interface Props {
  areas:     { id: string; name: string }[];
  tables:    SalonTable[];
  takeaways: SalonOrder[];
}

export default function SalonBoard({ areas, tables, takeaways }: Props) {
  const router = useRouter();
  const fmt = useMoney();
  const { run, authDialog } = useStaffAction();
  const [opening, setOpening] = useState<string | null>(null);
  const [takeawayOpen, setTakeawayOpen] = useState(false);
  const [takeawayName, setTakeawayName] = useState("");

  const groups = [
    ...areas.map((a) => ({ id: a.id, name: a.name, tables: tables.filter((t) => t.area_id === a.id) })),
    { id: "none", name: "Otras", tables: tables.filter((t) => !t.area_id) },
  ].filter((g) => g.tables.length > 0);

  const counts = {
    free:     tables.filter((t) => t.status === "free").length,
    occupied: tables.filter((t) => t.status !== "free").length,
  };

  function handleTable(t: SalonTable) {
    if (t.order) {
      router.push(`/orden/${t.order.id}`);
      return;
    }
    setOpening(t.id);
    run(() => openTable(t.id), {
      onSuccess: (orderId) => router.push(`/orden/${orderId}`),
      onError:   () => setOpening(null),
    });
  }

  function handleTakeaway(e: React.FormEvent) {
    e.preventDefault();
    run(() => openTakeaway(takeawayName), {
      onSuccess: (orderId) => {
        setTakeawayOpen(false);
        setTakeawayName("");
        router.push(`/orden/${orderId}`);
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Salón</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {counts.free} libres · {counts.occupied} ocupadas
          </p>
        </div>
        <Button variant="outline" size="lg" className="h-12 gap-2" onClick={() => setTakeawayOpen(true)}>
          <ShoppingBagIcon className="size-5" />
          Para llevar
        </Button>
      </div>

      {tables.length === 0 && (
        <div className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          Aún no hay mesas. La administradora las crea en <span className="font-medium">Mesas</span>.
        </div>
      )}

      {groups.map((g) => (
        <section key={g.id} className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{g.name}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {g.tables.map((t) => {
              const s = STATUS[t.status];
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTable(t)}
                  disabled={opening === t.id}
                  className={`relative min-h-28 rounded-2xl border-2 p-3 text-left transition-all active:scale-[0.97] disabled:opacity-70 ${s.card}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-lg font-bold leading-tight">{t.name}</p>
                    {opening === t.id && <Loader2Icon className="size-4 animate-spin text-primary" />}
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-xs font-medium">
                    <span className={`size-2 rounded-full ${s.dot}`} />
                    {s.label}
                  </p>
                  {t.order ? (
                    <div className="mt-2 space-y-0.5">
                      <p className="font-semibold">{fmt(t.order.total)}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <Elapsed since={t.order.openedAt} />
                        <span className="flex items-center gap-0.5"><UsersIcon className="size-3" />{t.order.guests}</span>
                      </p>
                      {t.order.pending > 0 && (
                        <p className="text-xs font-semibold text-accent">{t.order.pending} por enviar</p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">{t.seats} puestos</p>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {takeaways.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Para llevar</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {takeaways.map((o) => (
              <Link
                key={o.id}
                href={`/orden/${o.id}`}
                className="min-h-28 rounded-2xl border-2 border-primary/60 bg-primary/10 p-3 transition-all active:scale-[0.97]"
              >
                <p className="text-lg font-bold leading-tight truncate">{o.name || `Orden #${o.number}`}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs font-medium">
                  <ShoppingBagIcon className="size-3" /> Para llevar · #{o.number}
                </p>
                <p className="mt-2 font-semibold">{fmt(o.total)}</p>
                <p className="text-xs text-muted-foreground"><Elapsed since={o.openedAt} /></p>
                {o.pending > 0 && <p className="text-xs font-semibold text-accent">{o.pending} por enviar</p>}
              </Link>
            ))}
          </div>
        </section>
      )}

      <Dialog open={takeawayOpen} onOpenChange={setTakeawayOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Orden para llevar</DialogTitle></DialogHeader>
          <form onSubmit={handleTakeaway} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="tk-name">Nombre del cliente</Label>
              <Input id="tk-name" value={takeawayName} onChange={(e) => setTakeawayName(e.target.value)}
                placeholder="Opcional — para llamarlo cuando esté listo" autoFocus maxLength={60} />
            </div>
            <Button type="submit" variant="cta" className="w-full h-12 text-base">Abrir orden</Button>
          </form>
        </DialogContent>
      </Dialog>

      {authDialog}
    </div>
  );
}
