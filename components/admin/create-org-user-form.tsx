"use client";

import { cloneElement, isValidElement, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createOrgUser } from "@/app/(admin)/admin/[orgId]/actions";

export default function CreateOrgUserForm({ orgId }: { orgId: string }) {
  const [open, setOpen]     = useState(false);
  const [role, setRole]     = useState("owner");
  const [error, setError]   = useState<string | null>(null);
  const [pending, start]    = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("role", role);
    start(async () => {
      const result = await createOrgUser(orgId, fd);
      if (result?.error) { setError(result.error); toast.error(result.error); }
      else { setOpen(false); toast.success("Usuario creado"); }
    });
  }

  return (
    <>
      <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
        + Agregar usuario
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nuevo usuario</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input name="full_name" placeholder="Nombre completo" required />
            </div>
            <div className="space-y-1.5">
              <Label>Correo</Label>
              <Input name="email" type="email" placeholder="usuario@correo.com" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Contraseña</Label>
                <Input name="password" type="password" placeholder="Mín. 8 chars" required />
              </div>
              <div className="space-y-1.5">
                <Label>Rol</Label>
                <Select value={role} onValueChange={(v) => setRole(v ?? "owner")}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Dueña (owner)</SelectItem>
                    <SelectItem value="brand">Marca (brand)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" variant="cta" disabled={pending}>
                {pending ? "Creando…" : "Crear usuario"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
