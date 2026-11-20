// Illustrative product previews for the landing page: static sample data (the demo's brands), not live data.
import { ChefHatIcon, PackageIcon } from "lucide-react";
import { formatNio } from "@/lib/site";

const BRANDS = [
  { name: "Aroma Candle Co.",   sold: 9840, paid: true  },
  { name: "Hilos & Puntadas",   sold: 7320, paid: true  },
  { name: "Verde Vivo Plantas", sold: 5460, paid: false },
  { name: "Dulce Antojo",       sold: 3180, paid: false },
];

export function CollectivePreview() {
  const max = Math.max(...BRANDS.map((b) => b.sold));
  const total = BRANDS.reduce((sum, b) => sum + b.sold, 0);
  const paid = BRANDS.filter((b) => b.paid).length;

  return (
    <div role="img" aria-label="Ejemplo: lo que vendió cada marca en la quincena y si ya se le pagó" className="relative pb-10">
      <div className="rounded-3xl border bg-card p-5 sm:p-6 shadow-[0_30px_60px_-30px_rgba(11,30,102,0.35)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Liquidaciones · 1–15 de octubre</p>
            <p className="mt-1 font-heading text-2xl font-bold tabular-nums">{formatNio(total)}</p>
            <p className="text-xs text-muted-foreground">vendido entre {BRANDS.length} marcas</p>
          </div>
          <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            {paid}/{BRANDS.length} pagadas
          </span>
        </div>

        <ul className="mt-5 space-y-3.5">
          {BRANDS.map((b) => (
            <li key={b.name}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-medium">{b.name}</span>
                <span className="font-semibold tabular-nums">{formatNio(b.sold)}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(b.sold / max) * 100}%` }} />
                </div>
                <span className={`w-16 text-right text-[11px] font-medium ${
                  b.paid ? "text-green-700 dark:text-green-400" : "text-muted-foreground"
                }`}>
                  {b.paid ? "Pagada" : "Pendiente"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Low-stock alert, as the owner's dashboard shows it */}
      <div className="absolute bottom-0 left-3 sm:-left-5 flex items-center gap-2.5 rounded-2xl border bg-card px-3.5 py-2.5 shadow-lg">
        <span className="grid size-8 place-items-center rounded-xl bg-accent/15 text-accent">
          <PackageIcon className="size-4" />
        </span>
        <div className="leading-tight">
          <p className="text-xs font-semibold">Se está agotando</p>
          <p className="text-[11px] text-muted-foreground">Difusor de bambú · quedan 3</p>
        </div>
      </div>
    </div>
  );
}

// Same status colors + labels as the real floor (components/restaurante/salon/salon-board.tsx)
const STATUS = {
  free:     { label: "Libre",         card: "bg-card border-border",           dot: "bg-muted-foreground/40" },
  occupied: { label: "Ocupada",       card: "bg-primary/10 border-primary/60", dot: "bg-primary" },
  bill:     { label: "Cuenta pedida", card: "bg-accent/15 border-accent",      dot: "bg-accent" },
} as const;

const TABLES: { name: string; status: keyof typeof STATUS; total?: number; minutes?: number }[] = [
  { name: "Mesa 1",   status: "free" },
  { name: "Mesa 2",   status: "occupied", total: 640,  minutes: 25 },
  { name: "Mesa 3",   status: "bill",     total: 1180, minutes: 52 },
  { name: "Mesa 4",   status: "free" },
  { name: "Mesa 5",   status: "occupied", total: 320,  minutes: 8 },
  { name: "Kiosco 1", status: "occupied", total: 450,  minutes: 14 },
];

export function RestaurantPreview() {
  const busy = TABLES.filter((t) => t.status !== "free").length;

  return (
    <div role="img" aria-label="Ejemplo: el salón con mesas libres, ocupadas y con la cuenta pedida" className="relative pb-10">
      <div className="rounded-3xl border bg-card p-5 sm:p-6 shadow-[0_30px_60px_-30px_rgba(11,30,102,0.35)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Salón · hoy</p>
            <p className="mt-1 font-heading text-2xl font-bold">{busy} de {TABLES.length} mesas</p>
            <p className="text-xs text-muted-foreground">con clientes ahora</p>
          </div>
          <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">En vivo</span>
        </div>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {TABLES.map((t) => {
            const s = STATUS[t.status];
            return (
              <div key={t.name} className={`rounded-2xl border-2 p-3 ${s.card}`}>
                <p className="font-heading text-sm font-bold">{t.name}</p>
                <p className="mt-1 flex items-center gap-1.5 text-[11px] font-medium">
                  <span className={`size-2 rounded-full ${s.dot}`} />
                  {s.label}
                </p>
                <p className="mt-1.5 text-[11px] text-muted-foreground tabular-nums">
                  {t.total ? `${formatNio(t.total)} · ${t.minutes} min` : "—"}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* A new ticket reaching the kitchen */}
      <div className="absolute bottom-0 right-3 sm:-right-5 flex items-center gap-2.5 rounded-2xl border bg-card px-3.5 py-2.5 shadow-lg">
        <span className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary">
          <ChefHatIcon className="size-4" />
        </span>
        <div className="leading-tight">
          <p className="text-xs font-semibold">Comanda a cocina</p>
          <p className="text-[11px] text-muted-foreground">Mesa 5 · 2 platillos nuevos</p>
        </div>
      </div>
    </div>
  );
}
