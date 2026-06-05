"use client";

import { useTransition, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { updateOrganization } from "@/app/(admin)/admin/[orgId]/actions";
import type { Database } from "@/types/database";

type Org = Database["public"]["Tables"]["organizations"]["Row"];

export default function EditOrgForm({ org }: { org: Org }) {
  const [pending, startTransition] = useTransition();
  const [currency, setCurrency] = useState(org.currency);
  const [model, setModel]       = useState(org.settlement_model);
  const [period, setPeriod]     = useState(org.settlement_period);
  const [active, setActive]     = useState(org.active);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("currency", currency);
    formData.set("settlement_model", model);
    formData.set("settlement_period", period);
    formData.set("active", String(active));

    startTransition(async () => {
      const result = await updateOrganization(org.id, formData);
      if (result?.error) toast.error(result.error);
      else toast.success("Negocio actualizado");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-5 space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" name="name" defaultValue={org.name} required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Moneda</Label>
          <Select value={currency} onValueChange={(v) => setCurrency(v as "NIO" | "USD")}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NIO">C$ Córdoba</SelectItem>
              <SelectItem value="USD">$ Dólar</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Periodo</Label>
          <Select value={period} onValueChange={(v) => setPeriod(v as "quincenal" | "mensual")}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="quincenal">Quincenal</SelectItem>
              <SelectItem value="mensual">Mensual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Modelo de cobro</Label>
        <Select value={model} onValueChange={(v) => setModel(v as "commission" | "space_fee" | "both" | "none")}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="space_fee">Cuota por espacio</SelectItem>
            <SelectItem value="commission">Comisión %</SelectItem>
            <SelectItem value="both">Cuota + Comisión</SelectItem>
            <SelectItem value="none">Sin cobro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <Label>Negocio activo</Label>
        <Switch checked={active} onCheckedChange={setActive} />
      </div>

      <Button type="submit" variant="default" className="w-full" disabled={pending}>
        {pending ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}
