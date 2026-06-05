"use client";

import { cloneElement, isValidElement, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createProduct, updateProduct } from "@/app/(owner)/inventario/actions";
import type { Database } from "@/types/database";

type Product = Database["public"]["Tables"]["products"]["Row"];
type Brand = Database["public"]["Tables"]["brands"]["Row"];

interface Props {
  product?: Product;
  brands: Pick<Brand, "id" | "name">[];
  trigger: React.ReactNode;
}

export default function ProductDialog({ product, brands, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [brandId, setBrandId] = useState(product?.brand_id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("brand_id", brandId);

    startTransition(async () => {
      const result = product
        ? await updateProduct(product.id, formData)
        : await createProduct(formData);

      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        setOpen(false);
        toast.success(product ? "Producto actualizado" : "Producto creado");
      }
    });
  }

  const triggerEl = isValidElement(trigger)
    ? cloneElement(trigger as React.ReactElement<{ onClick?: () => void }>, {
        onClick: () => setOpen(true),
      })
    : trigger;

  return (
    <>
      {triggerEl}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {product ? "Editar producto" : "Nuevo producto"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Marca *</Label>
              <Select
                value={brandId}
                onValueChange={(val) => setBrandId(val ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona una marca">
                    {brandId
                      ? (brands.find((b) => b.id === brandId)?.name ?? "Selecciona una marca")
                      : "Selecciona una marca"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="code">Código / SKU *</Label>
                <Input
                  id="code"
                  name="code"
                  defaultValue={product?.code}
                  placeholder="Ej. GE-001"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={product?.name}
                  placeholder="Nombre del producto"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={product?.description ?? ""}
                placeholder="Descripción opcional"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="price">Precio (C$) *</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={product?.price ?? 0}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cost">Costo (C$)</Label>
                <Input
                  id="cost"
                  name="cost"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={product?.cost ?? ""}
                  placeholder="Opcional"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stock_quantity">Stock</Label>
                <Input
                  id="stock_quantity"
                  name="stock_quantity"
                  type="number"
                  min="0"
                  defaultValue={product?.stock_quantity ?? 0}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="low_stock_threshold">Alerta stock bajo (unidades)</Label>
              <Input
                id="low_stock_threshold"
                name="low_stock_threshold"
                type="number"
                min="0"
                defaultValue={product?.low_stock_threshold ?? 5}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={pending}
                variant="cta"
              >
                {pending ? "Guardando…" : "Guardar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
