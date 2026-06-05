import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { getMoney } from "@/lib/get-currency";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function MiInventarioPage() {
  const fmt = await getMoney();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("brand_id")
    .eq("id", user!.id)
    .single();

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("brand_id", profile!.brand_id!)
    .order("name");

  const activeCount = products?.filter((p) => p.active).length ?? 0;
  const lowStockCount =
    products?.filter((p) => p.active && p.stock_quantity <= p.low_stock_threshold)
      .length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" >
          Mi inventario
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {activeCount} productos activos
          {lowStockCount > 0 && (
            <span className="text-destructive ml-2">· {lowStockCount} con stock bajo</span>
          )}
        </p>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-center">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!products?.length && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                  No hay productos registrados en tu inventario.
                </TableCell>
              </TableRow>
            )}
            {products?.map((product) => {
              const isLow =
                product.active &&
                product.stock_quantity <= product.low_stock_threshold;
              return (
                <TableRow key={product.id}>
                  <TableCell className="font-mono text-sm">{product.code}</TableCell>
                  <TableCell>
                    <p className="font-medium">{product.name}</p>
                    {product.description && (
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {product.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    C${product.price.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={isLow ? "text-destructive font-semibold" : ""}>
                      {product.stock_quantity}
                    </span>
                    {isLow && (
                      <Badge variant="destructive" className="ml-2 text-xs">
                        Stock bajo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={product.active ? "outline" : "secondary"}>
                      {product.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
