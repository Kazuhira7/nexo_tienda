// Module registry — pure data, safe to import from server and client code.
// A "vertical" is just a preset of enabled modules; orgs can deviate from it.
import type { ModuleId, VerticalType } from "@/types/database";

export const MODULES: Record<ModuleId, { label: string; description: string }> = {
  pos:         { label: "Ventas y POS",    description: "Punto de venta y registro de ventas" },
  inventory:   { label: "Inventario",      description: "Productos, stock e importación" },
  customers:   { label: "Clientes",        description: "Registro y listado de clientes" },
  cash:        { label: "Cierre de caja",  description: "Cuadre diario de efectivo" },
  brands:      { label: "Marcas",          description: "Marcas en consignación y estados de cuenta" },
  settlements: { label: "Liquidaciones",   description: "Liquidaciones periódicas a marcas" },
  restaurant:  { label: "Salón y órdenes", description: "Mesas, comandas, cobro, menú y equipo con PIN" },
  kitchen:     { label: "Pantalla de cocina", description: "Comandas en tiempo real para cocina (KDS)" },
};

export const MODULE_IDS = Object.keys(MODULES) as ModuleId[];

export const VERTICAL_INFO: Record<VerticalType, { label: string; description: string }> = {
  colectivo:   { label: "Tienda colectiva", description: "Varias marcas venden bajo un mismo techo (consignación)" },
  retail:      { label: "Tienda / retail",  description: "Conveniencia, ropa o comercio general" },
  restaurante: { label: "Restaurante",      description: "Mesas, comandas y cocina" },
};

export const VERTICAL_PRESETS: Record<VerticalType, ModuleId[]> = {
  colectivo:   ["pos", "inventory", "customers", "cash", "brands", "settlements"],
  retail:      ["pos", "inventory", "customers", "cash"],
  restaurante: ["restaurant", "customers", "cash"],          // "kitchen" (KDS) opt-in per org
};

export function hasModule(
  modules: readonly string[] | null | undefined,
  id: ModuleId
): boolean {
  return (modules ?? []).includes(id);
}
