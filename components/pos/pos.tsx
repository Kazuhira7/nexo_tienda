"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useMoney } from "@/components/org-provider";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ProductResult = {
  id: string;
  code: string;
  name: string;
  price: number;
  stock_quantity: number;
  active: boolean;
  brands: { name: string } | null;
};

type CartItem = {
  product_id: string;
  code: string;
  name: string;
  brand_name: string;
  unit_price: number;
  quantity: number;
  discount: number; // per unit
  stock: number;    // available when added; the server re-checks
};

type Customer = { id: string; name: string; phone: string | null };

interface Props {
  soldBy: string;
  customers: Customer[];
}

/** Quoted PostgREST filter value: commas, parentheses or quotes in the text can't break the filter. */
function pgrstLike(pattern: string) {
  return `"${pattern.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Splits a sale-wide discount over the lines in proportion to their net amount (cents, exact sum). */
function spreadDiscount(nets: number[], discount: number): number[] {
  const total = nets.reduce((a, b) => a + b, 0);
  if (discount <= 0 || total <= 0) return nets.map(() => 0);
  const cents = Math.round(Math.min(discount, total) * 100);
  const shares = nets.map((n) => Math.floor((cents * n) / total));
  let rest = cents - shares.reduce((a, b) => a + b, 0);
  // leftover cents to the largest lines
  const order = nets.map((n, i) => [n, i] as const).sort((a, b) => b[0] - a[0]);
  for (let k = 0; rest > 0; k = (k + 1) % order.length, rest--) shares[order[k][1]]++;
  return shares.map((c) => c / 100);
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo",
  pos: "POS / Tarjeta",
  transfer: "Transferencia",
  mixed: "Mixto",
};

export default function POS({ soldBy, customers }: Props) {
  const router = useRouter();
  const money = useMoney();
  const [code, setCode] = useState("");
  const [suggestions, setSuggestions] = useState<ProductResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [customerId, setCustomerId] = useState<string>("");
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<{
    total: number;
    items: CartItem[];
    paymentMethod: string;
    saleId: string;
  } | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Autocompletado con debounce
  useEffect(() => {
    const term = code.trim();
    if (term.length < 2) return;
    const timer = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("products")
        .select("id, code, name, price, stock_quantity, active, brands(name)")
        .or(`code.ilike.${pgrstLike(`%${term}%`)},name.ilike.${pgrstLike(`%${term}%`)}`)
        .eq("active", true)
        .limit(6);
      setSuggestions((data as ProductResult[]) ?? []);
      setShowSuggestions(true);
    }, 250);
    return () => clearTimeout(timer);
  }, [code]);
  const visibleSuggestions = code.trim().length >= 2 && showSuggestions ? suggestions : [];

  // Cerrar sugerencias al click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const subtotal = cart.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const itemDiscounts = cart.reduce((sum, i) => sum + i.discount * i.quantity, 0);
  // The sale-wide discount can't exceed what's left after line discounts
  const appliedGlobal = Math.min(globalDiscount, Math.max(0, subtotal - itemDiscounts));
  const total = Math.max(0, subtotal - itemDiscounts - appliedGlobal);

  const addProductToCart = useCallback((data: ProductResult) => {
    setSearchError(null);
    setShowSuggestions(false);
    setCode("");

    if (!data.active) { setSearchError("Este producto está inactivo."); return; }

    const existing = cart.find((i) => i.product_id === data.id);
    if (existing) {
      if (existing.quantity >= data.stock_quantity) { setSearchError(`Solo hay ${data.stock_quantity} de "${data.name}".`); return; }
      setCart((prev) => prev.map((i) => i.product_id === data.id
        ? { ...i, quantity: i.quantity + 1, stock: data.stock_quantity } : i));
    } else {
      if (data.stock_quantity < 1) { setSearchError(`"${data.name}" no tiene existencias.`); return; }
      setCart((prev) => [...prev, {
        product_id: data.id, code: data.code, name: data.name,
        brand_name: data.brands?.name ?? "",
        unit_price: data.price, quantity: 1, discount: 0, stock: data.stock_quantity,
      }]);
    }
  }, [cart]);

  const searchProduct = useCallback(async () => {
    const term = code.trim();
    if (!term) return;
    setSearchError(null);
    const supabase = createClient();
    const fields = "id, code, name, price, stock_quantity, active, brands(name)";
    // Exact code first (barcode scanners type the full code + Enter), then a partial match
    const { data: exact } = await supabase
      .from("products").select(fields).eq("code", term).eq("active", true).limit(1).maybeSingle();
    const { data } = exact
      ? { data: exact }
      : await supabase
          .from("products").select(fields)
          .or(`code.ilike.${pgrstLike(`${term}%`)},name.ilike.${pgrstLike(`%${term}%`)}`)
          .eq("active", true)
          .order("code")
          .limit(1)
          .maybeSingle();
    if (!data) { setSearchError(`No se encontró "${term}".`); return; }
    addProductToCart(data as ProductResult);
  }, [code, addProductToCart]);

  function updateQty(productId: string, qty: number) {
    if (qty < 1) return removeItem(productId);
    const item = cart.find((i) => i.product_id === productId);
    if (item && qty > item.stock) { setSearchError(`Solo hay ${item.stock} de "${item.name}".`); return; }
    setSearchError(null);
    setCart((prev) =>
      prev.map((i) => (i.product_id === productId ? { ...i, quantity: qty } : i))
    );
  }

  function updateDiscount(productId: string, discount: number) {
    // Per-unit discount: never more than the price itself
    setCart((prev) =>
      prev.map((i) =>
        i.product_id === productId ? { ...i, discount: Math.min(i.unit_price, Math.max(0, discount)) } : i
      )
    );
  }

  function removeItem(productId: string) {
    setCart((prev) => prev.filter((i) => i.product_id !== productId));
  }

  async function handleConfirm() {
    if (!cart.length) return;
    setSubmitting(true);

    const supabase = createClient();
    // The sale-wide discount is shared by every line in proportion to its amount, so in a
    // collective each brand absorbs its fair part (it used to land entirely on the last line).
    const nets = cart.map((i) => (i.unit_price - i.discount) * i.quantity);
    const shares = spreadDiscount(nets, appliedGlobal);
    const items = cart.map((i, k) => ({
      product_id: i.product_id,
      quantity: i.quantity,
      unit_price: i.unit_price,
      discount: Math.round((i.discount * i.quantity + shares[k]) * 100) / 100,
    }));

    const { data: saleId, error } = await supabase.rpc("register_sale", {
      p_customer_id: customerId || null,
      p_payment_method: paymentMethod as "cash" | "pos" | "transfer" | "mixed",
      p_sold_by: soldBy,
      p_items: items,
    });

    if (error) {
      toast.error(error.message);
      setSubmitting(false);
      return;
    }

    // Mostrar confirmación con los items y dejar que la usuaria decida
    setConfirmed({ total, items: cart, paymentMethod, saleId: saleId as string });
  }

  // Pantalla de confirmación mejorada
  if (confirmed !== null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center gap-6 px-4">
        {/* Checkmark animado */}
        <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center"
          style={{ animation: "scaleIn 0.3s ease-out" }}>
          <svg
            className="w-12 h-12 text-green-600"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
            style={{ animation: "fadeIn 0.3s ease-out 0.2s both" }}
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <div>
          <h2 className="text-2xl font-bold font-heading">¡Venta registrada!</h2>
          <p className="text-4xl font-bold text-primary mt-2">
            {money(confirmed.total)}
          </p>
          <p className="text-muted-foreground mt-1">{PAYMENT_LABELS[confirmed.paymentMethod]}</p>
        </div>

        {/* Resumen de productos */}
        <div className="w-full max-w-sm rounded-lg border bg-card p-4 text-left space-y-2">
          {confirmed.items.map((item) => (
            <div key={item.product_id} className="flex justify-between text-sm">
              <span className="text-foreground">
                {item.quantity}× {item.name}
              </span>
              <span className="font-medium">
                {money((item.unit_price - item.discount) * item.quantity)}
              </span>
            </div>
          ))}
        </div>

        {/* Acciones */}
        <div className="flex gap-3 w-full max-w-sm">
          <Button variant="outline" className="flex-1" onClick={() => router.push(`/ventas/${confirmed.saleId}`)}>
            Ver recibo
          </Button>
          <Button
            variant="cta"
            className="flex-1"
            onClick={() => {
              setConfirmed(null);
              setCart([]);
              setCode("");
              setGlobalDiscount(0);
              setCustomerId("");
              setPaymentMethod("cash");
            }}
          >
            Nueva venta
          </Button>
        </div>

        <style>{`
          @keyframes scaleIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
          @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-48 sm:pb-0">
      <h1 className="text-2xl font-bold" >
        Punto de venta
      </h1>

      {/* Buscador con autocompletado */}
      <div className="relative" ref={searchRef}>
        <div className="flex gap-2">
          <Input
            placeholder="Buscar por código o nombre…"
            value={code}
            onChange={(e) => { setCode(e.target.value); setSearchError(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") { setShowSuggestions(false); searchProduct(); } if (e.key === "Escape") setShowSuggestions(false); }}
            className="text-base h-12"
            autoFocus
            autoCapitalize="none"
          />
          <Button
            onClick={() => { setShowSuggestions(false); searchProduct(); }}
            className="h-12 px-5 shrink-0"
            
          >
            Agregar
          </Button>
        </div>

        {/* Dropdown de sugerencias */}
        {visibleSuggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-card border rounded-lg shadow-lg overflow-hidden">
            {visibleSuggestions.map((p) => (
              <button
                key={p.id}
                className="w-full text-left px-4 py-3 hover:bg-muted transition-colors flex items-center justify-between gap-3"
                onMouseDown={(e) => { e.preventDefault(); addProductToCart(p); }}
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-mono">{p.code}</span>
                    {p.brands && <span className="ml-2">· {p.brands.name}</span>}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">{money(p.price)}</p>
                  <p className="text-xs text-muted-foreground">{p.stock_quantity} en stock</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {searchError && (
        <p className="text-sm text-destructive -mt-2">{searchError}</p>
      )}

      {/* Carrito vacío */}
      {cart.length === 0 && (
        <div className="rounded-lg border border-dashed py-14 text-center text-muted-foreground">
          <p className="text-sm">Escribe el código o nombre del producto para comenzar.</p>
        </div>
      )}

      {/* Items del carrito — tarjetas móvil-friendly */}
      {cart.length > 0 && (
        <div className="space-y-2">
          {cart.map((item) => (
            <div
              key={item.product_id}
              className="rounded-lg border bg-card p-3 space-y-2"
            >
              {/* Fila superior: nombre + eliminar */}
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <p className="font-medium leading-tight">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.brand_name && <>{item.brand_name} · </>}<span className="font-mono">{item.code}</span>
                  </p>
                </div>
                <button
                  onClick={() => removeItem(item.product_id)}
                  className="text-muted-foreground hover:text-destructive text-lg leading-none shrink-0 p-1"
                >
                  ✕
                </button>
              </div>

              {/* Fila inferior: cantidad + descuento + total */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Cantidad */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQty(item.product_id, item.quantity - 1)}
                    className="w-9 h-9 rounded-md border flex items-center justify-center text-lg font-bold hover:bg-muted"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-semibold text-base">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQty(item.product_id, item.quantity + 1)}
                    className="w-9 h-9 rounded-md border flex items-center justify-center text-lg font-bold hover:bg-muted"
                  >
                    +
                  </button>
                </div>

                {/* Precio unitario */}
                <span className="text-sm text-muted-foreground">
                  {money(item.unit_price)} c/u
                </span>

                {/* Descuento */}
                <div className="flex items-center gap-1 ml-auto">
                  <span className="text-xs text-muted-foreground">Dto:</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.discount || ""}
                    onChange={(e) =>
                      updateDiscount(item.product_id, parseFloat(e.target.value) || 0)
                    }
                    className="w-20 h-8 text-sm text-right"
                    placeholder="0"
                  />
                </div>

                {/* Total de línea */}
                <span className="font-bold text-base ml-auto">
                  {money((item.unit_price - item.discount) * item.quantity)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Panel de pago — sticky en móvil, normal en desktop */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 sm:static bg-card sm:bg-transparent border-t sm:border sm:rounded-lg shadow-2xl sm:shadow-none p-4 space-y-3 z-40">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Cliente (opcional)</Label>
              <Select value={customerId} onValueChange={(val) => setCustomerId(val ?? "")}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Sin cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin cliente</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Método de pago</Label>
              <Select value={paymentMethod} onValueChange={(val) => setPaymentMethod(val ?? "cash")}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Descuento global */}
          <div className="flex items-center gap-2">
            <Label className="text-xs shrink-0">Descuento total (C$)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={globalDiscount || ""}
              onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)}
              className="w-28 h-8 text-sm"
              placeholder="0"
            />
          </div>

          <Separator />

          {/* Totales y botón */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              {(itemDiscounts + appliedGlobal) > 0 && (
                <p className="text-xs text-muted-foreground line-through">
                  {money(subtotal)}
                </p>
              )}
              <p className="text-2xl font-bold">{money(total)}</p>
              <Badge variant="outline" className="text-xs">{PAYMENT_LABELS[paymentMethod]}</Badge>
            </div>

            <Button
              className="h-14 px-6 text-base font-bold flex-1 max-w-xs"
              variant="cta"
              onClick={handleConfirm}
              disabled={submitting}
            >
              {submitting ? "Registrando…" : "Confirmar venta"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
