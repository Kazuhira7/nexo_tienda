"use client";

import { useOptimistic, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeftIcon, ShoppingBagIcon, UsersIcon, MinusIcon, PlusIcon, MoreVerticalIcon, ChevronUpIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMoney } from "@/components/org-provider";
import { useStaffAction } from "@/components/staff/use-staff-action";
import Elapsed from "@/components/restaurante/elapsed";
import AnimatedNumber from "@/components/ui/animated-number";
import ItemSheet from "./item-sheet";
import OrderTicket from "./order-ticket";
import {
  addItem, cancelOrder, requestBill, sendToKitchen, setGuests, updateItem, voidItem,
} from "@/app/(restaurante)/orden/actions";
import type { OrderItemModifier, OrderItemStatus, OrderStatus, OrderType } from "@/types/database";

// ── Types shared with the server page ─────────────────────────
export interface OrderView {
  id:           string;
  number:       number;
  type:         OrderType;
  status:       OrderStatus;
  guests:       number;
  customerName: string | null;
  openedAt:     string;
  cancelReason: string | null;
  tableName:    string | null;
  waiter:       string | null;
}

export interface OrderItemRow {
  id:              string;
  menu_item_id:    string;
  item_name:       string;
  quantity:        number;
  unit_price:      number;
  modifiers:       OrderItemModifier[];
  modifiers_total: number;
  line_total:      number;
  notes:           string | null;
  status:          OrderItemStatus;
  created_at:      string;
  optimistic?:     boolean;
}

export interface MenuItemView {
  id:          string;
  name:        string;
  price:       number;
  category_id: string | null;
  available:   boolean;
  groupIds:    string[];
}

export interface MenuGroup {
  id:         string;
  name:       string;
  min_select: number;
  max_select: number;
  options:    { id: string; name: string; price_delta: number }[];
}

export interface MenuData {
  categories: { id: string; name: string }[];
  items:      MenuItemView[];
  groups:     MenuGroup[];
}

const ALL = "all";

export default function OrderScreen({ order, items, menu }: { order: OrderView; items: OrderItemRow[]; menu: MenuData }) {
  const router = useRouter();
  const fmt = useMoney();
  const { run, pending, authDialog } = useStaffAction();
  const [optimisticItems, addOptimistic] = useOptimistic(
    items,
    (state, added: OrderItemRow) => [...state, added]
  );

  const [category, setCategory] = useState<string>(menu.categories[0]?.id ?? ALL);
  const [sheetItem, setSheetItem] = useState<MenuItemView | null>(null);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const open = order.status === "open";
  const title = order.type === "dine_in"
    ? order.tableName ?? `Orden #${order.number}`
    : order.customerName || `Para llevar #${order.number}`;

  const visibleItems = category === ALL
    ? menu.items
    : menu.items.filter((i) => i.category_id === category || (category === "none" && !i.category_id));
  const hasUncategorized = menu.items.some((i) => !i.category_id);

  const activeItems = optimisticItems.filter((i) => i.status !== "cancelled");
  const total = activeItems.reduce((sum, i) => sum + i.line_total, 0);
  const pendingCount = optimisticItems.filter((i) => i.status === "pending").reduce((n, i) => n + i.quantity, 0);

  // ── Actions ──────────────────────────────────────────────────
  function add(item: MenuItemView, input: { quantity: number; modifierIds: string[]; notes: string }) {
    const mods = menu.groups.flatMap((g) => g.options).filter((o) => input.modifierIds.includes(o.id));
    const modsTotal = mods.reduce((s, o) => s + o.price_delta, 0);
    setSheetItem(null);
    run(
      () => addItem({ orderId: order.id, menuItemId: item.id, ...input }),
      {
        // Shows instantly; replaced by the real row when the server responds
        before: () => addOptimistic({
          id:              `tmp-${crypto.randomUUID()}`,
          menu_item_id:    item.id,
          item_name:       item.name,
          quantity:        input.quantity,
          unit_price:      item.price,
          modifiers:       mods,
          modifiers_total: modsTotal,
          line_total:      input.quantity * (item.price + modsTotal),
          notes:           input.notes.trim() || null,
          status:          "pending",
          created_at:      new Date().toISOString(),
          optimistic:      true,
        }),
      }
    );
  }

  function tapItem(item: MenuItemView) {
    if (!item.available || !open) return;
    if (item.groupIds.length > 0) setSheetItem(item);
    else add(item, { quantity: 1, modifierIds: [], notes: "" });
  }

  function changeQuantity(item: OrderItemRow, quantity: number) {
    run(() => updateItem(item.id, quantity, item.notes));
  }

  function remove(item: OrderItemRow) {
    if (item.status !== "pending" && !confirm(`¿Anular "${item.item_name}"? Ya se envió a cocina.`)) return;
    run((pin) => voidItem(item.id, pin), {
      onSuccess: () => toast.success(item.status === "pending" ? "Quitado" : "Platillo anulado"),
    });
  }

  function send() {
    run(() => sendToKitchen(order.id), {
      onSuccess: (count) => {
        toast.success(`${count} ${count === 1 ? "platillo enviado" : "platillos enviados"} a cocina`, {
          description: "La comanda sale en la impresora de la estación.",
        });
        setTicketOpen(false);
      },
    });
  }

  function bill() {
    run(() => requestBill(order.id), { onSuccess: () => toast.success("Cuenta pedida") });
  }

  function guests(delta: number) {
    const next = order.guests + delta;
    if (next < 1 || next > 99) return;
    run(() => setGuests(order.id, next));
  }

  function confirmCancel(e: React.FormEvent) {
    e.preventDefault();
    run((pin) => cancelOrder(order.id, cancelReason, pin), {
      onSuccess: () => {
        setCancelOpen(false);
        toast.success("Orden cancelada");
        router.push("/salon");
      },
    });
  }

  const ticket = (
    <OrderTicket
      order={order}
      items={optimisticItems}
      busy={pending}
      onQuantity={changeQuantity}
      onRemove={remove}
      onSend={send}
      onRequestBill={bill}
    />
  );

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Link href="/salon" aria-label="Volver al salón"
          className="size-11 rounded-xl border flex items-center justify-center shrink-0 active:bg-muted">
          <ArrowLeftIcon className="size-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate flex items-center gap-2">
            {order.type !== "dine_in" && <ShoppingBagIcon className="size-5 shrink-0" />}
            {title}
          </h1>
          <p className="text-xs text-muted-foreground">
            #{order.number} · <Elapsed since={order.openedAt} />{order.waiter && ` · ${order.waiter}`}
          </p>
        </div>
        {open && order.type === "dine_in" && (
          <div className="flex items-center rounded-xl border shrink-0" aria-label="Personas">
            <button type="button" aria-label="Menos personas" onClick={() => guests(-1)}
              className="size-10 flex items-center justify-center active:bg-muted rounded-l-xl">
              <MinusIcon className="size-4" />
            </button>
            <span className="px-1 flex items-center gap-1 text-sm font-semibold">
              <UsersIcon className="size-4 text-muted-foreground" />{order.guests}
            </span>
            <button type="button" aria-label="Más personas" onClick={() => guests(1)}
              className="size-10 flex items-center justify-center active:bg-muted rounded-r-xl">
              <PlusIcon className="size-4" />
            </button>
          </div>
        )}
        {open && (
          <Button variant="ghost" size="icon-lg" aria-label="Más opciones" onClick={() => setCancelOpen(true)}>
            <MoreVerticalIcon className="size-5" />
          </Button>
        )}
      </div>

      {!open && (
        <div className="rounded-xl border bg-muted/40 px-4 py-3 text-sm">
          {order.status === "paid"
            ? "Esta orden ya fue cobrada."
            : `Orden cancelada${order.cancelReason ? `: ${order.cancelReason}` : ""}.`}
        </div>
      )}

      <div className="md:grid md:grid-cols-[minmax(0,1fr)_320px] lg:grid-cols-[minmax(0,1fr)_360px] md:gap-4 md:items-start">
        {/* ── Menu ── */}
        {open ? (
          <div className="space-y-3">
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {[
                ...menu.categories,
                ...(hasUncategorized ? [{ id: "none", name: "Otros" }] : []),
                { id: ALL, name: "Todo" },
              ].map((c) => (
                <button key={c.id} type="button" onClick={() => setCategory(c.id)}
                  className={`h-11 px-4 rounded-full border text-sm font-medium whitespace-nowrap transition-all duration-200 active:scale-95 ${
                    category === c.id ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted"
                  }`}>
                  {c.name}
                </button>
              ))}
            </div>

            {menu.items.length === 0 ? (
              <p className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                El menú está vacío. La administradora lo arma en <span className="font-medium">Menú</span>.
              </p>
            ) : (
              <div key={category} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {visibleItems.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => tapItem(item)}
                    disabled={!item.available}
                    style={{ "--i": idx } as React.CSSProperties}
                    className="animate-enter min-h-20 rounded-xl border bg-card p-3 text-left transition-all duration-150 hover:border-primary/40 hover:shadow-sm active:scale-[0.95] active:bg-primary/10 disabled:opacity-50 disabled:active:scale-100"
                  >
                    <p className="font-semibold leading-tight text-sm">{item.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{fmt(item.price)}</p>
                    {!item.available && <Badge variant="destructive" className="mt-1">Agotado</Badge>}
                    {item.available && item.groupIds.length > 0 && (
                      <p className="mt-0.5 text-[10px] text-primary font-medium">+ opciones</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="hidden md:block" />
        )}

        {/* ── Ticket: side panel on tablet/desktop ── */}
        <aside className="hidden md:flex md:flex-col rounded-2xl border bg-card p-4 md:sticky md:top-28 lg:top-16 md:max-h-[calc(100vh-9rem)]">
          {ticket}
        </aside>

        {/* ── Ticket on phones: inline when closed, bottom sheet when open ── */}
        {!open && <div className="md:hidden rounded-2xl border bg-card p-4">{ticket}</div>}
      </div>

      {/* ── Phone summary bar ── */}
      {open && (
        <div className="md:hidden fixed left-0 right-0 bottom-16 z-30 px-3 pb-2">
          <button type="button" onClick={() => setTicketOpen(true)}
            className="w-full h-14 rounded-2xl bg-foreground text-background px-4 flex items-center justify-between shadow-xl">
            <span className="flex items-center gap-2 text-sm font-medium">
              <ChevronUpIcon className="size-4" />
              Ver orden · {activeItems.reduce((n, i) => n + i.quantity, 0)}
              {pendingCount > 0 && <span className="text-accent">({pendingCount} por enviar)</span>}
            </span>
            <span className="text-lg font-bold"><AnimatedNumber value={total} /></span>
          </button>
        </div>
      )}
      <Sheet open={ticketOpen} onOpenChange={setTicketOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl px-4 pb-6">
          <SheetHeader className="px-0"><SheetTitle>{title}</SheetTitle></SheetHeader>
          {ticket}
        </SheetContent>
      </Sheet>

      <ItemSheet
        item={sheetItem}
        groups={menu.groups}
        onClose={() => setSheetItem(null)}
        onAdd={(input) => sheetItem && add(sheetItem, input)}
      />

      {/* ── Cancel order ── */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Cancelar orden</DialogTitle></DialogHeader>
          <form onSubmit={confirmCancel} className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Se anulan todos los platillos y la mesa queda libre. Requiere permiso para cancelar órdenes.
            </p>
            <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Motivo (obligatorio)" rows={2} required maxLength={200} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCancelOpen(false)}>Volver</Button>
              <Button type="submit" variant="destructive" disabled={!cancelReason.trim() || pending}>
                Cancelar orden
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {authDialog}
    </div>
  );
}
