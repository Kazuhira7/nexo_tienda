// Staff permission registry — pure data, safe to import from server and client code.
// Staff members (PIN users) get a position preset that pre-fills permissions;
// each member's permissions can then be adjusted individually.
// Keep PERMISSION_IDS in sync with the check constraint on staff_members.permissions
// (docs/db/006_restaurante.sql).

export const PERMISSIONS = {
  "orders.take":       { label: "Tomar órdenes",           description: "Abrir mesas, agregar platillos, pedir la cuenta" },
  "orders.send":       { label: "Enviar a cocina",         description: "Mandar los platillos pendientes a cocina" },
  "orders.void_item":  { label: "Anular platillo enviado", description: "Anular un platillo que cocina ya recibió" },
  "orders.cancel":     { label: "Cancelar orden",          description: "Cancelar una orden completa con motivo" },
  "orders.discount":   { label: "Aplicar descuentos",      description: "Descontar al cobrar" },
  "payments.collect":  { label: "Cobrar",                  description: "Cerrar la cuenta y registrar el pago" },
  "kitchen.update":    { label: "Cocina",                  description: "Marcar platillos como preparando o listos" },
  "menu.availability": { label: "Marcar agotado",          description: "Activar o desactivar platillos en pleno servicio" },
} as const;

export type PermissionId = keyof typeof PERMISSIONS;

export const PERMISSION_IDS = Object.keys(PERMISSIONS) as PermissionId[];

export const POSITION_PRESETS: Record<string, PermissionId[]> = {
  "Mesero":          ["orders.take", "orders.send"],
  "Cajero":          ["orders.take", "orders.send", "payments.collect", "orders.discount"],
  "Cocina":          ["kitchen.update", "menu.availability"],
  "Gerente / Admin": [...PERMISSION_IDS],
};

export const POSITION_NAMES = Object.keys(POSITION_PRESETS);

export function hasPermission(
  permissions: readonly string[] | null | undefined,
  id: PermissionId
): boolean {
  return (permissions ?? []).includes(id);
}

/** Parses the `needs_permission:<id>` hint raised by require_staff(). */
export function neededPermission(hint: string | null | undefined): PermissionId | null {
  const match = hint?.match(/^needs_permission:(.+)$/);
  const id = match?.[1];
  return id && id in PERMISSIONS ? (id as PermissionId) : null;
}
