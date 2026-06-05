import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PrintButton from "@/components/reporte/print-button";
import { getMoney } from "@/lib/get-currency";

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo",
  pos: "POS / Tarjeta",
  transfer: "Transferencia",
  mixed: "Mixto",
};

interface Props {
  params: Promise<{ brandId: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function ReportePage({ params, searchParams }: Props) {
  const fmt = await getMoney();
  const { brandId } = await params;
  const { from, to } = await searchParams;

  const supabase = await createClient();

  const { data: brand } = await supabase
    .from("brands")
    .select("id, name, contact_name, email, phone, space_fee")
    .eq("id", brandId)
    .single();

  if (!brand) notFound();

  // Rango de fechas: parámetros o periodo actual
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const defaultStart = d <= 15 ? new Date(y, m, 1) : new Date(y, m, 16);
  const defaultEnd = d <= 15
    ? new Date(y, m, 15, 23, 59, 59)
    : new Date(y, m + 1, 0, 23, 59, 59);

  const start = from ? new Date(from + "T00:00:00") : defaultStart;
  const end = to ? new Date(to + "T23:59:59") : defaultEnd;

  // Fetch all items for this brand, filter by date in JS (embedded table filters unreliable in PostgREST)
  const { data: allItems } = await supabase
    .from("sale_items")
    .select(
      `quantity, unit_price, discount, line_total,
       products(code, name),
       sales(sale_number, payment_method, created_at, cancelled)`
    )
    .eq("brand_id", brandId);

  const items = (allItems ?? [])
    .filter((item) => {
      const sale = item.sales as { created_at: string; cancelled: boolean } | null;
      if (!sale || sale.cancelled) return false;
      const d = new Date(sale.created_at);
      return d >= start && d <= end;
    })
    .sort((a, b) => {
      const da = new Date((a.sales as { created_at: string }).created_at).getTime();
      const db = new Date((b.sales as { created_at: string }).created_at).getTime();
      return da - db;
    });

  const totalVentas = items.reduce((s, i) => s + i.line_total, 0);
  const totalDesc = items.reduce((s, i) => s + i.discount, 0);
  const totalCantidad = items.reduce((s, i) => s + i.quantity, 0);

  const periodoLabel = `${start.toLocaleDateString("es-NI", { day: "numeric", month: "long" })} – ${end.toLocaleDateString("es-NI", { day: "numeric", month: "long", year: "numeric" })}`;

  const generadoEl = new Date().toLocaleDateString("es-NI", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <>
      {/* Botón imprimir — oculto al imprimir */}
      <div className="no-print flex gap-3 mb-6 items-center">
        <PrintButton />
        <span className="text-sm text-muted-foreground">
          El PDF se guarda desde el diálogo de impresión del navegador.
        </span>
      </div>

      {/* Contenido del reporte */}
      <div className="reporte-print max-w-3xl mx-auto bg-white p-8 rounded-lg border print:border-0 print:p-0 print:max-w-none">
        {/* Encabezado */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <p className="text-2xl font-bold text-[#1B4FFF]" >
              nexo
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Sistema de Tienda Colectiva</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Generado el {generadoEl}</p>
          </div>
        </div>

        {/* Info de la marca */}
        <div className="mb-6 pb-6 border-b">
          <h1 className="text-xl font-bold">{brand.name}</h1>
          <p className="text-sm text-gray-600 mt-1">
            Reporte quincenal de ventas · {periodoLabel}
          </p>
          <div className="flex gap-6 mt-2 text-sm text-gray-500">
            {brand.contact_name && <span>Contacto: {brand.contact_name}</span>}
            {brand.phone && <span>Tel: {brand.phone}</span>}
            {brand.email && <span>{brand.email}</span>}
          </div>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="rounded-lg bg-gray-50 p-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total vendido</p>
            <p className="text-2xl font-bold mt-1">{fmt(totalVentas)}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Artículos vendidos</p>
            <p className="text-2xl font-bold mt-1">{totalCantidad}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Descuentos</p>
            <p className="text-2xl font-bold mt-1">{fmt(totalDesc)}</p>
          </div>
        </div>

        {/* Tabla de ventas */}
        <table className="w-full text-sm mb-8">
          <thead>
            <tr className="border-b-2 border-gray-200 text-left">
              <th className="pb-2 font-semibold text-gray-700">Fecha</th>
              <th className="pb-2 font-semibold text-gray-700">Producto</th>
              <th className="pb-2 font-semibold text-gray-700 text-center">Cant.</th>
              <th className="pb-2 font-semibold text-gray-700 text-right">Precio</th>
              <th className="pb-2 font-semibold text-gray-700 text-right">Descuento</th>
              <th className="pb-2 font-semibold text-gray-700 text-center">Pago</th>
              <th className="pb-2 font-semibold text-gray-700 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {!items?.length && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-400">
                  Sin ventas en este periodo.
                </td>
              </tr>
            )}
            {items?.map((item, idx) => {
              const sale = item.sales as {
                sale_number: number;
                payment_method: string;
                created_at: string;
                cancelled: boolean;
              };
              const product = item.products as { code: string; name: string } | null;
              return (
                <tr
                  key={idx}
                  className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">
                    {new Date(sale.created_at).toLocaleDateString("es-NI", {
                      month: "short", day: "numeric",
                    })}
                  </td>
                  <td className="py-2 pr-3">
                    <p className="font-medium">{product?.name ?? "—"}</p>
                    <p className="text-xs text-gray-400 font-mono">{product?.code}</p>
                  </td>
                  <td className="py-2 text-center">{item.quantity}</td>
                  <td className="py-2 text-right">{fmt(item.unit_price)}</td>
                  <td className="py-2 text-right text-gray-500">
                    {item.discount > 0 ? `−${fmt(item.discount)}` : "—"}
                  </td>
                  <td className="py-2 text-center text-xs text-gray-500">
                    {PAYMENT_LABELS[sale.payment_method] ?? sale.payment_method}
                  </td>
                  <td className="py-2 text-right font-semibold">
                    C${item.line_total.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 font-bold">
              <td colSpan={2} className="pt-3">Total</td>
              <td className="pt-3 text-center">{totalCantidad}</td>
              <td></td>
              <td className="pt-3 text-right text-gray-500">
                {totalDesc > 0 ? `−${fmt(totalDesc)}` : ""}
              </td>
              <td></td>
              <td className="pt-3 text-right text-lg">{fmt(totalVentas)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Cuota de espacio */}
        {brand.space_fee > 0 && (
          <div className="rounded-lg border border-gray-200 p-4 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Cuota por espacio — {periodoLabel}</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  Monto a abonar por concepto de espacio en tienda
                </p>
              </div>
              <p className="text-xl font-bold">{fmt(brand.space_fee)}</p>
            </div>
          </div>
        )}

        {/* Pie */}
        <div className="text-xs text-gray-400 text-center pt-4 border-t">
          <p>Reporte generado por nexo · sistema de gestión de tienda colectiva</p>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          header, nav, footer { display: none !important; }
          body { background: white; }
        }
      `}</style>
    </>
  );
}
