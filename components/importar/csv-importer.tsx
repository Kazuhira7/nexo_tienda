"use client";

import { useState, useRef, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UploadIcon, FileIcon, CheckIcon, XIcon, DownloadIcon } from "lucide-react";
import { importProducts, type ImportRow } from "@/app/(owner)/importar/actions";
import { parseAmount, parseCsv } from "@/lib/csv";

const EXAMPLE_BRANDS = `marca,codigo,nombre,precio,costo,stock,descripcion
Glam Express,GE-001,Perfume Jean Paul,5000,3200,10,Fragancia masculina 100ml
Glam Express,GE-002,Labial rojo,250,120,25,
Flor Boutique,FB-001,Blusa floreada talla S,680,350,8,"Tela algodón, manga corta"`;
const EXAMPLE_STORE = `codigo,nombre,precio,costo,stock,descripcion
7501001,Martillo de uña 16 oz,450,280,12,
7501002,Clavo 2 pulgadas (libra),45,28,80,
7501003,Pintura blanca galón,980,690,6,"Látex, interior"`;

const HEADER_KEYS = {
  brand_name:     ["marca", "brand", "brand_name"],
  code:           ["codigo", "código", "code", "sku", "barras", "codigo de barras", "código de barras"],
  name:           ["nombre", "name", "producto", "descripcion corta"],
  price:          ["precio", "price", "precio venta", "precio de venta"],
  cost:           ["costo", "cost", "precio compra", "precio de compra"],
  stock_quantity: ["stock", "stock_quantity", "cantidad", "existencias", "existencia"],
  description:    ["descripcion", "descripción", "description", "detalle"],
} as const;

function parseRows(text: string, useBrands: boolean): ImportRow[] {
  const [header, ...lines] = parseCsv(text);
  if (!header || lines.length === 0) return [];
  const cols = header.map((h) => h.toLowerCase());
  const col = (keys: readonly string[]) => cols.findIndex((h) => keys.includes(h));
  const idx = Object.fromEntries(Object.entries(HEADER_KEYS).map(([k, keys]) => [k, col(keys)])) as Record<keyof typeof HEADER_KEYS, number>;
  const at = (values: string[], i: number) => (i >= 0 ? values[i] ?? "" : "");

  return lines
    .map((values) => {
      const price = parseAmount(at(values, idx.price));
      const cost = parseAmount(at(values, idx.cost));
      const stock = parseAmount(at(values, idx.stock_quantity));
      return {
        brand_name:     at(values, idx.brand_name),
        code:           at(values, idx.code),
        name:           at(values, idx.name),
        price:          Number.isFinite(price) ? price : 0,
        cost:           Number.isFinite(cost) && cost > 0 ? cost : undefined,
        stock_quantity: Number.isFinite(stock) ? Math.trunc(stock) : 0,
        description:    at(values, idx.description) || undefined,
      };
    })
    .filter((r) => r.code && r.name && (!useBrands || r.brand_name));
}

function downloadTemplate(useBrands: boolean) {
  // BOM so Excel opens the accents correctly
  const blob = new Blob(["\uFEFF" + (useBrands ? EXAMPLE_BRANDS : EXAMPLE_STORE)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "plantilla_inventario_nexo.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function CSVImporter({ useBrands = true }: { useBrands?: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [pending, startTransition] = useTransition();

  function handleFile(file: File) {
    setResult(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseRows(text, useBrands);
      setRows(parsed);
      if (parsed.length === 0) {
        toast.error("No se encontraron filas válidas. Revisa el formato del archivo.");
      } else {
        toast.success(`${parsed.length} productos encontrados. Revisa la vista previa.`);
      }
    };
    reader.readAsText(file, "utf-8");
  }

  function handleImport() {
    startTransition(async () => {
      const res = await importProducts(rows);
      setResult(res);
      if (res.imported > 0) {
        toast.success(`${res.imported} productos importados correctamente`);
      }
      if (res.errors.length > 0) {
        toast.error(`${res.errors.length} errores durante la importación`);
      }
    });
  }

  const brandCounts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.brand_name] = (acc[r.brand_name] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Instrucciones + descarga plantilla */}
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <h2 className="font-semibold">Formato del archivo CSV</h2>
        <p className="text-sm text-muted-foreground">
          El archivo debe tener estas columnas (en cualquier orden):
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            ...(useBrands ? [{ col: "marca", req: true }] : []),
            { col: "codigo", req: true },
            { col: "nombre", req: true },
            { col: "precio", req: true },
            { col: "costo", req: false },
            { col: "stock", req: false },
            { col: "descripcion", req: false },
          ].map(({ col, req }) => (
            <span key={col} className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-mono ${
              req ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            }`}>
              {col} {req && <span className="text-primary font-bold">*</span>}
            </span>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {useBrands && "Si la marca no existe, se crea automáticamente. "}
          Si el código ya existe, se actualiza el producto (incluidas sus existencias). En Excel: Archivo → Guardar
          como → CSV.
        </p>
        <Button variant="outline" size="sm" onClick={() => downloadTemplate(useBrands)} className="gap-1.5">
          <DownloadIcon className="size-3.5" />
          Descargar plantilla de ejemplo
        </Button>
      </div>

      {/* Upload */}
      <div
        className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
          rows.length > 0 ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
        }`}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        {rows.length > 0 ? (
          <div className="flex flex-col items-center gap-2">
            <FileIcon className="size-10 text-primary" />
            <p className="font-semibold text-primary">{fileName}</p>
            <p className="text-sm text-muted-foreground">
              {rows.length} productos{useBrands && ` · ${Object.keys(brandCounts).length} marcas`}
            </p>
            <p className="text-xs text-muted-foreground">Haz clic para cambiar el archivo</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <UploadIcon className="size-10 text-muted-foreground/50" />
            <p className="font-medium">Arrastra tu archivo CSV aquí</p>
            <p className="text-sm text-muted-foreground">o haz clic para seleccionarlo</p>
          </div>
        )}
      </div>

      {/* Vista previa */}
      {rows.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Vista previa</h2>
            <div className="flex flex-wrap gap-2">
              {useBrands && Object.entries(brandCounts).map(([brand, count]) => (
                <Badge key={brand} variant="outline">{brand} · {count} productos</Badge>
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    {[...(useBrands ? ["Marca"] : []), "Código", "Nombre", "Precio", "Stock"].map((h) => (
                      <th key={h} className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.slice(0, 10).map((row, i) => (
                    <tr key={i} className="hover:bg-muted/20">
                      {useBrands && <td className="px-3 py-2 text-muted-foreground">{row.brand_name}</td>}
                      <td className="px-3 py-2 font-mono">{row.code}</td>
                      <td className="px-3 py-2 font-medium max-w-[200px] truncate">{row.name}</td>
                      <td className="px-3 py-2">C${row.price.toFixed(2)}</td>
                      <td className="px-3 py-2">{row.stock_quantity ?? 0}</td>
                    </tr>
                  ))}
                  {rows.length > 10 && (
                    <tr>
                      <td colSpan={useBrands ? 5 : 4} className="px-3 py-2 text-center text-muted-foreground text-xs">
                        … y {rows.length - 10} productos más
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <Button
            variant="cta"
            className="w-full h-11 text-base font-semibold gap-2"
            onClick={handleImport}
            disabled={pending}
          >
            <UploadIcon className="size-4" />
            {pending ? "Importando…" : `Importar ${rows.length} productos`}
          </Button>
        </div>
      )}

      {/* Resultado */}
      {result && (
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h2 className="font-semibold">Resultado de la importación</h2>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-green-600">
              <CheckIcon className="size-4" />
              <span><strong>{result.imported}</strong> importados</span>
            </div>
            {result.skipped > 0 && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <XIcon className="size-4" />
                <span><strong>{result.skipped}</strong> omitidos</span>
              </div>
            )}
          </div>
          {result.errors.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-destructive">Errores:</p>
              {result.errors.slice(0, 5).map((e, i) => (
                <p key={i} className="text-xs text-muted-foreground">· {e}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
