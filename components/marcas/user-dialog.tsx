"use client";

import { cloneElement, isValidElement, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createBrandUser } from "@/app/(owner)/marcas/user-actions";

interface Props {
  brandId: string;
  brandName: string;
  trigger: React.ReactNode;
}

export default function UserDialog({ brandId, brandName, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createBrandUser(brandId, formData);
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        setOpen(false);
        toast.success(`Usuario creado para ${brandName}`);
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
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Crear acceso para {brandName}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Nombre del usuario</Label>
              <Input id="full_name" name="full_name" placeholder="Nombre completo" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" name="email" type="email" placeholder="marca@correo.com" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" name="password" type="password" placeholder="Mínimo 8 caracteres" required />
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
                {pending ? "Creando…" : "Crear acceso"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
