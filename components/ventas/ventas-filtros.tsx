"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Brand = { id: string; name: string };

interface Props {
  brands: Brand[];
}

export default function VentasFiltros({ brands }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const clearAll = () => router.push(pathname);

  const hasFilters =
    searchParams.has("desde") ||
    searchParams.has("hasta") ||
    searchParams.has("marca") ||
    searchParams.has("pago");

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Desde</Label>
          <Input
            type="date"
            className="h-8 text-sm"
            defaultValue={searchParams.get("desde") ?? ""}
            onChange={(e) => updateParam("desde", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Hasta</Label>
          <Input
            type="date"
            className="h-8 text-sm"
            defaultValue={searchParams.get("hasta") ?? ""}
            onChange={(e) => updateParam("hasta", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Marca</Label>
          <Select
            value={searchParams.get("marca") ?? ""}
            onValueChange={(val) => updateParam("marca", val ?? "")}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas</SelectItem>
              {brands.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Método de pago</Label>
          <Select
            value={searchParams.get("pago") ?? ""}
            onValueChange={(val) => updateParam("pago", val ?? "")}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="cash">Efectivo</SelectItem>
              <SelectItem value="pos">POS / Tarjeta</SelectItem>
              <SelectItem value="transfer">Transferencia</SelectItem>
              <SelectItem value="mixed">Mixto</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {hasFilters && (
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={clearAll}>
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
