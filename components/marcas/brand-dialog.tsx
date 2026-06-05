"use client";

import { cloneElement, isValidElement, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createBrand, updateBrand } from "@/app/(owner)/marcas/actions";
import type { Database } from "@/types/database";

type Brand = Database["public"]["Tables"]["brands"]["Row"];

interface Props {
  brand?: Brand;
  trigger: React.ReactNode;
}

export default function BrandDialog({ brand, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = brand
        ? await updateBrand(brand.id, formData)
        : await createBrand(formData);

      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        setOpen(false);
        toast.success(brand ? "Marca actualizada" : "Marca creada");
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {brand ? "Editar marca" : "Nueva marca"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre de la marca *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={brand?.name}
              placeholder="Ej. Glam Express"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="contact_name">Contacto</Label>
              <Input
                id="contact_name"
                name="contact_name"
                defaultValue={brand?.contact_name ?? ""}
                placeholder="Nombre"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={brand?.phone ?? ""}
                placeholder="8888-0000"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={brand?.email ?? ""}
              placeholder="marca@correo.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="space_fee">Cuota por espacio (C$)</Label>
              <Input
                id="space_fee"
                name="space_fee"
                type="number"
                min="0"
                step="0.01"
                defaultValue={brand?.space_fee ?? 0}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="commission_rate">Comisión (%)</Label>
              <Input
                id="commission_rate"
                name="commission_rate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                defaultValue={brand?.commission_rate ?? 0}
                placeholder="0.00"
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
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
