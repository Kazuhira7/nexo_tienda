"use client";

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PrinterIcon, RotateCcwIcon, CheckIcon, ClockIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { printTicket } from "@/components/restaurante/print-ticket";
import KitchenTicket, { type KitchenTicketView } from "./kitchen-ticket";
import { markPrinted, reprint } from "@/app/(estacion)/impresion/actions";

const AUTO_KEY = "nexo-print-auto";
const POLL_MS = 20_000; // backstop if the Realtime connection drops

const SAMPLE: KitchenTicketView = {
  id: "test", ticket_number: 0, round: 1, title: "Prueba de impresora", orderNumber: 0, staff: null,
  created_at: new Date().toISOString(), printed_at: null,
  items: [
    { qty: 2, name: "Churrasco", modifiers: ["Tres cuartos", "Extra queso"], notes: "sin sal", station: "kitchen" },
    { qty: 1, name: "Fresco natural", modifiers: [], notes: null, station: "bar" },
  ],
};

// "Impresión automática" preference, per device (localStorage, with a safe fallback)
const autoListeners = new Set<() => void>();
function readAuto(): boolean {
  try { return localStorage.getItem(AUTO_KEY) !== "off"; } catch { return true; }
}
function writeAuto(on: boolean) {
  try { localStorage.setItem(AUTO_KEY, on ? "on" : "off"); } catch { /* private mode */ }
  autoListeners.forEach((l) => l());
}
function subscribeAuto(listener: () => void) {
  autoListeners.add(listener);
  return () => { autoListeners.delete(listener); };
}

// Fixed screen on the restaurant computer: prints every new kitchen ticket automatically.
// With Chrome started with --kiosk-printing, window.print() goes straight to the default printer.
export default function PrintStation({ tickets, timezone }: { tickets: KitchenTicketView[]; timezone: string }) {
  const router = useRouter();
  const auto = useSyncExternalStore(subscribeAuto, readAuto, () => true);
  const [printing, setPrinting] = useState<KitchenTicketView | null>(null);
  const [, startTransition] = useTransition();
  const busy = useRef(false);

  useEffect(() => {
    const id = setInterval(() => router.refresh(), POLL_MS);
    return () => clearInterval(id);
  }, [router]);

  const pending = tickets
    .filter((t) => !t.printed_at)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const nextId = pending[0]?.id;

  // Queue: take the oldest pending ticket when idle
  useEffect(() => {
    if (!auto || busy.current || !nextId) return;
    const next = tickets.find((t) => t.id === nextId);
    if (!next) return;
    busy.current = true;
    let started = false;
    const frame = requestAnimationFrame(() => {
      started = true;
      setPrinting(next);
    });
    return () => {
      // Only release the queue if this ticket never started printing
      if (!started) {
        cancelAnimationFrame(frame);
        busy.current = false;
      }
    };
  }, [auto, nextId, tickets]);

  // Print once the ticket is rendered, then mark it and move on
  useEffect(() => {
    if (!printing) return;
    const frame = requestAnimationFrame(() => {
      printTicket(); // blocks until the print job is handed off
      const done = () => {
        busy.current = false;
        setPrinting(null);
        router.refresh();
      };
      if (printing.id === SAMPLE.id) {
        done();
        return;
      }
      startTransition(async () => {
        const result = await markPrinted(printing.id);
        if ("error" in result) toast.error(result.error);
        done();
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [printing, router]);

  function toggleAuto(on: boolean) {
    writeAuto(on);
  }

  function printSample() {
    if (busy.current) return;
    busy.current = true;
    setPrinting({ ...SAMPLE, created_at: new Date().toISOString() });
  }

  function doReprint(id: string) {
    startTransition(async () => {
      const result = await reprint(id);
      if ("error" in result) toast.error(result.error);
      else router.refresh();
    });
  }

  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString("es-NI", { timeZone: timezone, hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PrinterIcon className="size-6 text-primary" /> Estación de impresión
          </h1>
          <p className="text-sm text-muted-foreground">
            Deja esta pantalla abierta en la computadora: cada &quot;Enviar a cocina&quot; imprime su comanda.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
            <Switch checked={auto} onCheckedChange={toggleAuto} />
            Impresión automática
          </label>
          <Button variant="outline" onClick={printSample} className="gap-1.5">
            <PrinterIcon className="size-4" /> Imprimir prueba
          </Button>
        </div>
      </div>

      {!auto && pending.length > 0 && (
        <p className="rounded-xl border border-accent bg-accent/10 px-4 py-3 text-sm font-medium">
          Hay {pending.length} comanda(s) sin imprimir. Activa la impresión automática.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] items-start">
        {/* What is being printed right now (also the print source) */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {printing ? "Imprimiendo…" : "En espera"}
          </p>
          {printing ? (
            <KitchenTicket ticket={printing} timezone={timezone} printable />
          ) : (
            <div className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
              {pending.length ? `${pending.length} en cola` : "Sin comandas pendientes"}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Comandas de hoy</p>
          {tickets.length === 0 ? (
            <p className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
              Todavía no se ha enviado nada a cocina.
            </p>
          ) : (
            <ul className="rounded-xl border bg-card divide-y">
              {tickets.map((t) => (
                <li key={t.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">
                      #{t.ticket_number} · {t.title}
                      {t.round > 1 && <span className="text-muted-foreground font-normal"> · ronda {t.round}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {time(t.created_at)}{t.staff && ` · ${t.staff}`} · {t.items.map((i) => `${i.qty} ${i.name}`).join(", ")}
                    </p>
                  </div>
                  {t.printed_at ? (
                    <Badge variant="secondary" className="gap-1 shrink-0"><CheckIcon className="size-3" />{time(t.printed_at)}</Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 shrink-0"><ClockIcon className="size-3" />Pendiente</Badge>
                  )}
                  <Button variant="ghost" size="sm" className="gap-1 shrink-0" onClick={() => doReprint(t.id)}
                    disabled={!t.printed_at}>
                    <RotateCcwIcon className="size-3.5" /> Reimprimir
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <details className="rounded-xl border bg-card px-4 py-3 text-sm">
        <summary className="font-medium cursor-pointer">Cómo configurar la impresora (una sola vez)</summary>
        <ol className="list-decimal pl-5 mt-3 space-y-1.5 text-muted-foreground">
          <li>Instala la impresora térmica en Windows y déjala como <b>impresora predeterminada</b>, con papel de 80 mm.</li>
          <li>Crea un acceso directo de Google Chrome y en <b>Destino</b> agrega al final:
            <code className="block mt-1 rounded bg-muted px-2 py-1 text-foreground text-xs">--kiosk-printing</code>
            Así Chrome imprime sin preguntar.</li>
          <li>Abre Nexo con ese acceso directo, inicia sesión con la cuenta del local y entra a esta pantalla.</li>
          <li>Toca <b>Imprimir prueba</b>. Si sale el ticket, listo: deja esta pestaña abierta durante el servicio.</li>
        </ol>
      </details>
    </div>
  );
}
