"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { updateOrgSettings } from "@/app/(owner)/configuracion/actions";
import type { Database } from "@/types/database";

type Org = Database["public"]["Tables"]["organizations"]["Row"];

const MODEL_INFO = {
  space_fee:  { label: "Cuota por espacio", desc: "Se cobra una tarifa fija a cada marca por su espacio en la tienda" },
  commission: { label: "Comisión por venta", desc: "Se cobra un porcentaje de las ventas de cada marca" },
  both:       { label: "Cuota + Comisión", desc: "Se cobran ambos: tarifa fija de espacio más comisión sobre ventas" },
  none:       { label: "Sin cobro", desc: "No se aplica ningún cargo a las marcas" },
};

export default function OrgSettingsForm({ org, modules = [] }: { org: Org; modules?: readonly string[] }) {
  const hasBrands = modules.includes("brands");
  const hasRestaurant = modules.includes("restaurant");
  const [pending, start]        = useTransition();
  const [name, setName]         = useState(org.name);
  const [exchangeRate, setRate] = useState(String(org.exchange_rate ?? 36.63));
  const [currency, setCurrency] = useState(org.currency);
  const [model, setModel]       = useState(org.settlement_model);
  const [period, setPeriod]     = useState(org.settlement_period);
  const [ticket, setTicket]     = useState({
    ticket_address: org.ticket_address ?? "",
    ticket_phone:   org.ticket_phone ?? "",
    ticket_tax_id:  org.ticket_tax_id ?? "",
    ticket_footer:  org.ticket_footer ?? "",
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("name", name);
    fd.set("exchange_rate", exchangeRate);
    fd.set("currency", currency);
    fd.set("settlement_model", model);
    fd.set("settlement_period", period);
    if (hasRestaurant) {
      for (const [k, v] of Object.entries(ticket)) fd.set(k, v);
    }
    start(async () => {
      const result = await updateOrgSettings(org.id, fd);
      if (result.error) toast.error(result.error);
      else toast.success("Configuración guardada");
    });
  }

  return (
    <div className="space-y-6">
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Información básica */}
      <section className="rounded-xl border bg-card p-5 space-y-4">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Información del negocio</h2>
        <div className="space-y-1.5">
          <Label htmlFor="name">Nombre del negocio</Label>
          <Input
            id="name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>Identificador (slug)</Label>
          <Input value={org.slug} disabled className="font-mono opacity-60 cursor-not-allowed" />
          <p className="text-xs text-muted-foreground">El identificador no se puede cambiar.</p>
        </div>
      </section>

      {/* Moneda */}
      <section className="rounded-xl border bg-card p-5 space-y-4">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Moneda</h2>
        <div className="grid grid-cols-2 gap-3">
          {(["NIO", "USD"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCurrency(c)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                currency === c
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <p className="text-2xl font-bold">{c === "NIO" ? "C$" : "$"}</p>
              <p className="text-sm font-medium mt-1">{c === "NIO" ? "Córdoba (NIO)" : "Dólar (USD)"}</p>
            </button>
          ))}
        </div>
        {/* Tasa de cambio */}
        <div className="space-y-1.5 pt-1">
          <Label htmlFor="exchange_rate">
            Tasa de cambio (C$ por $1 USD)
          </Label>
          <Input
            id="exchange_rate"
            name="exchange_rate"
            type="number"
            step="0.01"
            min="1"
            value={exchangeRate}
            onChange={(e) => setRate(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Tasa oficial Banco Central de Nicaragua. Actualiza si cambia.
            Valor actual: <strong>C$ {parseFloat(exchangeRate || "36.63").toFixed(2)} = $1 USD</strong>
          </p>
        </div>
      </section>

      {/* Datos del ticket (restaurante) */}
      {hasRestaurant && (
        <section className="rounded-xl border bg-card p-5 space-y-4">
          <div>
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Datos para el ticket</h2>
            <p className="text-xs text-muted-foreground mt-1">Aparecen en la pre-cuenta, el recibo y la comanda. Todos son opcionales.</p>
          </div>
          {([
            ["ticket_address", "Dirección", "Ej. Del parque central 2 c. al sur", 120],
            ["ticket_phone",   "Teléfono",  "Ej. 8888-0000", 40],
            ["ticket_tax_id",  "RUC",       "Si tienes", 30],
            ["ticket_footer",  "Mensaje al pie", "Ej. ¡Gracias por su visita!", 120],
          ] as const).map(([key, label, placeholder, max]) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={key}>{label}</Label>
              <Input id={key} value={ticket[key]} maxLength={max} placeholder={placeholder}
                onChange={(e) => setTicket((t) => ({ ...t, [key]: e.target.value }))} />
            </div>
          ))}
        </section>
      )}

      {/* Modelo de liquidación */}
      {hasBrands && (
      <section className="rounded-xl border bg-card p-5 space-y-4">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Modelo de cobro a marcas</h2>
        <div className="space-y-2">
          {(Object.entries(MODEL_INFO) as [Org["settlement_model"], typeof MODEL_INFO[keyof typeof MODEL_INFO]][]).map(([key, { label, desc }]) => (
            <button
              key={key}
              type="button"
              onClick={() => setModel(key)}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                model === key
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <p className="font-semibold text-sm">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </button>
          ))}
        </div>
      </section>

      )}

      {/* Periodo de liquidación */}
      {hasBrands && (
      <section className="rounded-xl border bg-card p-5 space-y-4">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Periodo de liquidación</h2>
        <div className="grid grid-cols-2 gap-3">
          {([["quincenal", "Quincenal", "Cierres el 15 y fin de mes"], ["mensual", "Mensual", "Un cierre al fin de cada mes"]] as const).map(([val, label, desc]) => (
            <button
              key={val}
              type="button"
              onClick={() => setPeriod(val)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                period === val
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <p className="font-semibold text-sm">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </button>
          ))}
        </div>
      </section>
      )}

      <Button type="submit" variant="cta" className="w-full h-11 font-semibold" disabled={pending}>
        {pending ? "Guardando…" : "Guardar configuración"}
      </Button>
    </form>

    </div>
  );
}
