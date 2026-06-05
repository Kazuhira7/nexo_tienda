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
import { createCustomer, updateCustomer } from "@/app/(owner)/clientes/actions";
import type { Database } from "@/types/database";

type Customer = Database["public"]["Tables"]["customers"]["Row"];

interface Props {
  customer?: Customer;
  trigger: React.ReactNode;
}

export default function CustomerDialog({ customer, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = customer
        ? await updateCustomer(customer.id, formData)
        : await createCustomer(formData);

      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        setOpen(false);
        toast.success(customer ? "Cliente actualizado" : "Cliente registrado");
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
              {customer ? "Editar cliente" : "Nuevo cliente"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                name="name"
                defaultValue={customer?.name}
                placeholder="Nombre completo"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={customer?.phone ?? ""}
                  placeholder="8888-0000"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Correo</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={customer?.email ?? ""}
                  placeholder="correo@ejemplo.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={customer?.notes ?? ""}
                placeholder="Observaciones sobre el cliente"
                rows={3}
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
