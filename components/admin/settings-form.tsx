"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePlatformSettings } from "@/app/(admin)/admin/ajustes/actions";
import type { Database } from "@/types/database";

type Settings = Database["public"]["Tables"]["platform_settings"]["Row"];

const FIELDS: { name: keyof Settings; label: string; hint?: string; type?: string }[] = [
  { name: "trial_days",      label: "Días de prueba gratis", hint: "Al cambiarlo, recuerda actualizar la página de ventas (lib/site.ts)." },
  { name: "grace_days",      label: "Días de gracia",        hint: "Después de vencer, cuántos días sigue abierto antes de bloquearse." },
  { name: "warn_days",       label: "Avisar desde",          hint: "Días antes del vencimiento en que la dueña ve el aviso." },
  { name: "fee_restaurante", label: "Mensualidad restaurante (C$)" },
  { name: "fee_retail",      label: "Mensualidad tienda (C$)" },
  { name: "fee_colectivo",   label: "Mensualidad colectivo (C$)" },
  { name: "sales_whatsapp",  label: "WhatsApp de ventas", hint: "Con código de país, ej. 50588887777.", type: "tel" },
  { name: "support_hours",   label: "Horario de atención", type: "text" },
];

export default function SettingsForm({ settings }: { settings: Settings }) {
  const [pending, start] = useTransition();
  return (
    <form className="rounded-xl border bg-card p-5 grid sm:grid-cols-2 gap-4" onSubmit={(e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      start(async () => {
        const result = await updatePlatformSettings(fd);
        if (result?.error) toast.error(result.error);
        else toast.success("Ajustes guardados");
      });
    }}>
      {FIELDS.map((f) => (
        <div key={f.name} className="space-y-1.5">
          <Label htmlFor={f.name}>{f.label}</Label>
          <Input id={f.name} name={f.name} type={f.type ?? "number"} min={f.type ? undefined : 0} step={f.type ? undefined : "any"}
            defaultValue={settings[f.name] ?? ""} required={f.name !== "sales_whatsapp"} />
          {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
        </div>
      ))}
      <Button type="submit" className="sm:col-span-2" disabled={pending}>
        {pending && <Loader2Icon className="size-4 animate-spin" />} Guardar ajustes
      </Button>
    </form>
  );
}
