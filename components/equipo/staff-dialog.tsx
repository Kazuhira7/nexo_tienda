"use client";

import { cloneElement, isValidElement, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { saveStaffMember } from "@/app/(owner)/equipo/actions";
import {
  PERMISSIONS, PERMISSION_IDS, POSITION_PRESETS, POSITION_NAMES, type PermissionId,
} from "@/lib/permissions";
import type { Database } from "@/types/database";

type StaffMember = Database["public"]["Tables"]["staff_members"]["Row"];

interface Props {
  member?:   StaffMember;
  hasPin?:   boolean;
  trigger:   React.ReactNode;
  /** New member linked to the owner's own account ("Agregarme al equipo"). */
  selfName?: string;
}

export default function StaffDialog({ member, hasPin, trigger, selfName }: Props) {
  const linkSelf = !member && selfName !== undefined;
  const initialPosition = member?.position ?? (linkSelf ? "Gerente / Admin" : "Mesero");

  const [open, setOpen]               = useState(false);
  const [name, setName]               = useState(member?.name ?? selfName ?? "");
  const [position, setPosition]       = useState(initialPosition);
  const [permissions, setPermissions] = useState<PermissionId[]>(
    (member?.permissions as PermissionId[] | undefined) ?? POSITION_PRESETS[initialPosition] ?? []
  );
  const [pin, setPin]                 = useState("");
  const [error, setError]             = useState<string | null>(null);
  const [pending, startTransition]    = useTransition();

  function choosePreset(preset: string) {
    setPosition(preset);
    setPermissions(POSITION_PRESETS[preset] ?? []);
  }

  function togglePermission(id: PermissionId, on: boolean) {
    setPermissions((prev) => (on ? [...prev, id] : prev.filter((p) => p !== id)));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveStaffMember(member?.id ?? null, {
        name, position, permissions, pin, linkSelf,
      });
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        setOpen(false);
        setPin("");
        toast.success(member ? "Cambios guardados" : `${name} ya puede entrar con su PIN`);
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
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {member ? "Editar persona" : linkSelf ? "Agregarme al equipo" : "Nueva persona"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="staff-name">Nombre *</Label>
              <Input
                id="staff-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Como aparecerá en las órdenes"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff-position">Puesto *</Label>
              <div className="flex flex-wrap gap-2">
                {POSITION_NAMES.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => choosePreset(preset)}
                    className={`px-3 h-9 rounded-full border text-sm transition-colors ${
                      position === preset
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <Input
                id="staff-position"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="O escribe otro puesto"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Permisos</Label>
              <div className="rounded-xl border divide-y">
                {PERMISSION_IDS.map((id) => (
                  <label key={id} className="flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer">
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{PERMISSIONS[id].label}</span>
                      <span className="block text-xs text-muted-foreground">{PERMISSIONS[id].description}</span>
                    </span>
                    <Switch
                      checked={permissions.includes(id)}
                      onCheckedChange={(on) => togglePermission(id, on)}
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="staff-pin">
                PIN de 4 dígitos {member ? "" : "*"}
              </Label>
              <Input
                id="staff-pin"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                inputMode="numeric"
                autoComplete="off"
                placeholder={member && hasPin ? "Déjalo vacío para no cambiarlo" : "Ej. 4821"}
                className="tracking-[0.5em] font-mono"
                required={!member}
              />
              <p className="text-xs text-muted-foreground">
                Cada persona tiene un PIN distinto. Cambiarlo cierra sus sesiones abiertas.
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="cta" disabled={pending}>
                {pending ? "Guardando…" : "Guardar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
