import type { KitchenTicketItem } from "@/types/database";

export interface KitchenTicketView {
  id:            string;
  ticket_number: number;
  round:         number;
  items:         KitchenTicketItem[];
  created_at:    string;
  printed_at:    string | null;
  title:         string;        // "Mesa 3" / "Para llevar — Ana"
  orderNumber:   number;
  staff:         string | null;
}

// Kitchen order ticket ("comanda") for an 80 mm printer: big, high-contrast, notes inverted.
// `printable` adds data-print-ticket so printTicket() prints only this element.
export default function KitchenTicket({
  ticket, timezone, printable,
}: {
  ticket:     KitchenTicketView;
  timezone:   string;
  printable?: boolean;
}) {
  const time = new Date(ticket.created_at).toLocaleTimeString("es-NI", {
    timeZone: timezone, hour: "2-digit", minute: "2-digit",
  });
  const kitchen = ticket.items.filter((i) => i.station !== "bar");
  const bar = ticket.items.filter((i) => i.station === "bar");

  return (
    <div
      {...(printable ? { "data-print-ticket": "" } : {})}
      className="rounded-xl border bg-white text-black p-4 font-mono text-[13px] leading-snug"
    >
      <div className="flex justify-between items-baseline">
        <span className="font-bold">COMANDA #{ticket.ticket_number}</span>
        {ticket.round > 1 && <span className="font-bold">RONDA {ticket.round}</span>}
      </div>
      <p className="text-2xl font-black leading-tight mt-1 uppercase">{ticket.title}</p>
      <p className="text-xs">Orden #{ticket.orderNumber} · {time}{ticket.staff && ` · ${ticket.staff}`}</p>

      <Lines items={kitchen} />
      {bar.length > 0 && (
        <>
          <p className="mt-3 text-center font-bold tracking-widest">— BARRA —</p>
          <Lines items={bar} />
        </>
      )}
      <div className="mt-3 border-t border-dashed border-black" />
    </div>
  );
}

function Lines({ items }: { items: KitchenTicketItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-3 border-t border-dashed border-black pt-2 space-y-2">
      {items.map((i, idx) => (
        <div key={idx}>
          <p className="text-lg font-bold leading-tight">
            <span className="inline-block min-w-8">{i.qty}</span>{i.name}
          </p>
          {i.modifiers.length > 0 && <p className="pl-8">· {i.modifiers.join(" · ")}</p>}
          {i.notes && (
            <p className="ml-8 mt-0.5 inline-block bg-black text-white px-1.5 font-bold">NOTA: {i.notes}</p>
          )}
        </div>
      ))}
    </div>
  );
}
