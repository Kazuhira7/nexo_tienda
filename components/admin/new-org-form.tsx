"use client";

import { useTransition, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createOrganization } from "@/app/(admin)/admin/actions";

export default function NewOrgForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState("NIO");
  const [model, setModel] = useState("space_fee");
  const [period, setPeriod] = useState("quincenal");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("currency", currency);
    formData.set("settlement_model", model);
    formData.set("settlement_period", period);

    startTransition(async () => {
      const result = await createOrganization(formData);
      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Datos del negocio */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Negocio</h2>

        <div className="space-y-1.5">
          <Label htmlFor="name">Nombre del negocio *</Label>
          <Input id="name" name="name" placeholder="Tienda Colectiva Bello" required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="slug">
            Identificador único (slug) *
            <span className="text-muted-foreground font-normal ml-1">— solo letras minúsculas y guiones</span>
          </Label>
          <Input id="slug" name="slug" placeholder="tienda-bello" pattern="[a-z0-9-]+" required />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Moneda</Label>
            <Select value={currency} onValueChange={(v) => setCurrency(v ?? "NIO")}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NIO">C$ Córdoba (NIO)</SelectItem>
                <SelectItem value="USD">$ Dólar (USD)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Modelo de cobro</Label>
            <Select value={model} onValueChange={(v) => setModel(v ?? "space_fee")}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="space_fee">Cuota por espacio</SelectItem>
                <SelectItem value="commission">Comisión %</SelectItem>
                <SelectItem value="both">Cuota + Comisión</SelectItem>
                <SelectItem value="none">Sin cobro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Periodo</Label>
            <Select value={period} onValueChange={(v) => setPeriod(v ?? "quincenal")}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="quincenal">Quincenal</SelectItem>
                <SelectItem value="mensual">Mensual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Datos de la dueña */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Dueña / Owner</h2>

        <div className="space-y-1.5">
          <Label htmlFor="owner_name">Nombre *</Label>
          <Input id="owner_name" name="owner_name" placeholder="Nombre completo" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="owner_email">Correo *</Label>
            <Input id="owner_email" name="owner_email" type="email" placeholder="duena@tienda.com" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="owner_password">Contraseña *</Label>
            <Input id="owner_password" name="owner_password" type="password" placeholder="Mínimo 8 caracteres" required />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <Button type="submit" variant="cta" className="w-full h-11 font-semibold" disabled={pending}>
        {pending ? "Creando negocio…" : "Crear negocio y dueña"}
      </Button>
    </form>
  );
}
