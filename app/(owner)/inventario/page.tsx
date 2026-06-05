import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import ProductDialog from "@/components/inventario/product-dialog";
import ToggleProductActive from "@/components/inventario/toggle-active";
import StockDialog from "@/components/inventario/stock-dialog";
import EmptyState from "@/components/empty-state";
import { getMoney } from "@/lib/get-currency";

export default async function InventarioPage() {
  const fmt = await getMoney();
  const supabase = await createClient();
  const [{ data: products }, { data: brands }] = await Promise.all([
    supabase.from("products").select("*, brands(name)").order("name"),
    supabase.from("brands").select("*").eq("active", true).order("name"),
  ]);

  const lowCount = products?.filter(p => p.active && p.stock_quantity <= p.low_stock_threshold).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{products?.length ?? 0} productos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {lowCount > 0 && <span className="text-destructive font-medium">{lowCount} con stock bajo · </span>}
            Inventario completo de la tienda
          </p>
        </div>
        <ProductDialog brands={brands ?? []}
          trigger={<Button variant="cta">+ Nuevo producto</Button>} />
      </div>

      {!products?.length ? (
        <EmptyState
          icon="box"
          title="Sin productos en inventario"
          description="Primero agrega al menos una marca, luego agrega productos con su código y precio."
          action={<ProductDialog brands={brands ?? []} trigger={<Button variant="cta">Agregar primer producto</Button>} />}
        />
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden sm:block rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-center">Activo</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => {
                  const isLow = product.active && product.stock_quantity <= product.low_stock_threshold;
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-mono text-sm">{product.code}</TableCell>
                      <TableCell>
                        <p className="font-medium">{product.name}</p>
                        {product.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[160px]">{product.description}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {(product.brands as { name: string } | null)?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">{fmt(product.price)}</TableCell>
                      <TableCell className="text-right">
                        <span className={isLow ? "text-destructive font-semibold" : ""}>{product.stock_quantity}</span>
                        {isLow && <Badge variant="destructive" className="ml-2 text-xs">Bajo</Badge>}
                      </TableCell>
                      <TableCell className="text-center">
                        <ToggleProductActive id={product.id} active={product.active} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <StockDialog productId={product.id} productName={product.name} currentStock={product.stock_quantity}
                            trigger={<Button variant="ghost" size="sm" className="text-muted-foreground">Stock</Button>} />
                          <ProductDialog product={product} brands={brands ?? []}
                            trigger={<Button variant="ghost" size="sm">Editar</Button>} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Móvil — cards */}
          <div className="sm:hidden space-y-3">
            {products.map((product) => {
              const isLow = product.active && product.stock_quantity <= product.low_stock_threshold;
              const brandName = (product.brands as { name: string } | null)?.name;
              return (
                <div key={product.id} className="rounded-xl border bg-card p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-mono">{product.code}</span>
                        {brandName && <span className="ml-2">· {brandName}</span>}
                      </p>
                    </div>
                    <ToggleProductActive id={product.id} active={product.active} />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-lg">{fmt(product.price)}</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${isLow ? "text-destructive" : "text-muted-foreground"}`}>
                        {product.stock_quantity} en stock
                      </span>
                      {isLow && <Badge variant="destructive" className="text-xs">Bajo</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1 border-t">
                    <StockDialog productId={product.id} productName={product.name} currentStock={product.stock_quantity}
                      trigger={<Button variant="outline" size="sm" className="flex-1">Ajustar stock</Button>} />
                    <ProductDialog product={product} brands={brands ?? []}
                      trigger={<Button variant="outline" size="sm" className="flex-1">Editar</Button>} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
