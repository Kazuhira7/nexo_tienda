"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfileName } from "@/app/(owner)/perfil/actions";

interface Props { userId: string; currentName: string; email: string }

export default function ProfileForm({ userId, currentName, email }: Props) {
  const [name, setName] = useState(currentName);
  const [pending, start] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const result = await updateProfileName(userId, name);
      if (result.error) toast.error(result.error);
      else toast.success("Nombre actualizado");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-5 space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="full_name">Nombre completo</Label>
        <Input
          id="full_name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tu nombre"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label>Correo electrónico</Label>
        <Input value={email} disabled className="opacity-60 cursor-not-allowed" />
        <p className="text-xs text-muted-foreground">
          El correo no se puede cambiar desde aquí. Contacta al administrador si necesitas actualizarlo.
        </p>
      </div>
      <Button type="submit" variant="default" disabled={pending || name === currentName}>
        {pending ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}
