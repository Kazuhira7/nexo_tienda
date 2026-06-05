import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import BrandDialog from "@/components/marcas/brand-dialog";
import ToggleBrandActive from "@/components/marcas/toggle-active";
import UserDialog from "@/components/marcas/user-dialog";
import EmptyState from "@/components/empty-state";
import { getMoney } from "@/lib/get-currency";

export default async function MarcasPage() {
  const fmt = await getMoney();
  const supabase = await createClient();
  const { data: brands } = await supabase
    .from("brands")
    .select("*")
    .order("name");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{brands?.length ?? 0} marcas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gestiona las marcas de tu tienda</p>
        </div>
        <BrandDialog
          trigger={<Button variant="cta">+ Nueva marca</Button>}
        />
      </div>

      {!brands?.length ? (
        <EmptyState
          icon="store"
          title="No hay marcas todavía"
          description="Agrega la primera marca para empezar a registrar productos y ventas."
          action={
            <BrandDialog trigger={<Button variant="cta">Agregar primera marca</Button>} />
          }
        />
      ) : (
        <>
          {/* Desktop — tabla */}
          <div className="hidden sm:block rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Marca</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead className="text-right">Cuota espacio</TableHead>
                  <TableHead className="text-center">Activa</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brands.map((brand) => (
                  <TableRow key={brand.id}>
                    <TableCell>
                      <p className="font-medium">{brand.name}</p>
                      {brand.email && <p className="text-xs text-muted-foreground">{brand.email}</p>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{brand.contact_name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{brand.phone ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">{fmt(brand.space_fee)}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <ToggleBrandActive id={brand.id} active={brand.active} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <UserDialog brandId={brand.id} brandName={brand.name}
                          trigger={<Button variant="ghost" size="sm" className="text-muted-foreground">+ Usuario</Button>} />
                        <BrandDialog brand={brand}
                          trigger={<Button variant="ghost" size="sm">Editar</Button>} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Móvil — cards */}
          <div className="sm:hidden space-y-3">
            {brands.map((brand) => (
              <div key={brand.id} className="rounded-xl border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{brand.name}</p>
                    {brand.email && <p className="text-xs text-muted-foreground">{brand.email}</p>}
                  </div>
                  <ToggleBrandActive id={brand.id} active={brand.active} />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {brand.contact_name && <span>{brand.contact_name}</span>}
                  {brand.phone && <span>{brand.phone}</span>}
                  {brand.space_fee > 0 && <span className="font-medium text-foreground">{fmt(brand.space_fee)}/período</span>}
                </div>
                <div className="flex gap-2 pt-1 border-t">
                  <UserDialog brandId={brand.id} brandName={brand.name}
                    trigger={<Button variant="outline" size="sm" className="flex-1">+ Usuario</Button>} />
                  <BrandDialog brand={brand}
                    trigger={<Button variant="outline" size="sm" className="flex-1">Editar</Button>} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
