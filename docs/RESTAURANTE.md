# RESTAURANTE.md — Vertical Nexo Restaurante

> Complemento de `docs/CONTEXTO.md` (v3). Todas sus reglas siguen vigentes: multi-tenant, RLS en dos niveles,
> UI en español, código en inglés, mobile-first, tokens de marca, **módulos sobre silos**.
> Origen: `CLAUDE_restaurante.md` (escrito contra v2), adaptado aquí a la arquitectura real del repo.

---

## 1. Contexto

Llegó una clienta real (por referencia): restaurante pequeño, **14 espacios entre mesas y kioscos**, **un mesero +
la dueña**, menú por categorías (platos fuertes, para picar, para compartir, postres). Por eso el vertical restaurante
se adelanta respecto al roadmap de CONTEXTO v3.

Se construye **una versión de restaurante que sirva a la mayoría**, no algo a la medida de la clienta. Mismo
código, misma BD, mismo deploy.

**Prioridad de diseño: velocidad.** El mesero toma una orden completa en el celular, con una mano, de pie junto a la
mesa. Si una acción frecuente toma más de 3 toques, está mal diseñada.

---

## 2. Cómo encaja en la plataforma (v3)

- La org tiene `organizations.vertical = 'restaurante'`. Es solo el preset inicial.
- **Lo que se ve lo deciden los módulos** (`organizations.enabled_modules`, `lib/modules.ts`):
  - `restaurant`: salón, órdenes, cobro, menú, mesas y equipo.
  - `kitchen`: pantalla de cocina. Va aparte porque algunos negocios usan ticket impreso.
  - Preset del vertical: `restaurant, kitchen, customers, cash`. No incluye `pos` ni `inventory`, porque el POS
    colectivo exige `brand_id`.
- La navegación sale de `components/nav-items.ts`, filtrada por módulo **y** rol. Nada de sidebars por tipo de
  negocio.
- `homeRoute(role, vertical)` en `lib/home-route.ts`:
  - `terminal` → `/salon`
  - owner de restaurante → `/salon`
  - todo redirect de "lugar equivocado" pasa por `/`
- Reutiliza del Core:
  - `organizations`, `profiles`, auth y RLS;
  - `customers`;
  - `sales`: cada cuenta cobrada genera **una** fila con `source = 'restaurant'`;
  - `cash_closures` (cierre de caja), formato de moneda y componentes UI.
- `order_items` es el detalle de la venta del restaurante. **No** se usan `sale_items` (exige `brand_id`).
- `lib/` genérico jamás importa lógica de restaurante; los verticales pueden importar del Core.

---

## 3. Identidad: cuenta del local + PIN (estilo POS Master)

POS Master (instalado en cada computadora) solo pide PIN. Nexo está en internet, así que el PIN solo no basta:

| Capa | Qué es | Dónde |
|---|---|---|
| **Cuenta de auth** | `owner` (dueña, correo + contraseña) o `terminal` ("cuenta del local", se abre **una vez por dispositivo**) | `profiles.role` |
| **Empleado** | Persona con **PIN de 4 dígitos** y permisos según su puesto | `staff_members` (+ `staff_pins`, hash bcrypt inaccesible) |
| **Sesión de PIN** | Token en cookie `httpOnly` (`nexo_staff`); en BD solo su sha256, ligado a la cuenta que lo creó | `staff_sessions` |

- La `terminal` sola **no puede operar**: toda RPC operativa recibe `p_staff_token` y valida el permiso con
  `require_staff()`.
- Se bloquea por inactividad: 5 min en el cliente, 30 min en el servidor como respaldo; `/cocina` no se bloquea.
  También con el botón "Cambiar usuario".
- **10 PIN fallidos en 5 min** bloquean el PIN de la org por 5 min.
- **Autorización de supervisor:** si alguien no tiene un permiso, la RPC lanza el hint
  `needs_permission:<permiso>`. La UI pide el PIN de alguien que sí lo tenga y `authorizeWithPin()`
  (`lib/staff-session.ts`) crea un token de un solo uso (60 s) **en el servidor**, que se pasa directo a la RPC.
- La dueña gestiona su equipo en `/equipo`: crea personas, elige el puesto (preset), ajusta permisos, asigna el PIN y
  activa o desactiva. También crea su propio PIN para operar en el salón.
- La cuenta del local la crea el superadmin en *Admin → negocio → + Agregar usuario → Cuenta del local*.

**Permisos** (`lib/permissions.ts`, en sync con el check de `staff_members.permissions`):
`orders.take`, `orders.send`, `orders.void_item`, `orders.cancel`, `orders.discount`, `payments.collect`,
`kitchen.update`, `menu.availability`.

**Puestos preset:**

| Puesto | Permisos |
|---|---|
| Mesero | tomar, enviar |
| Cajero | tomar, enviar, cobrar, descuentos |
| Cocina | cocina, agotado |
| Gerente / Admin | todos |

---

## 4. Base de datos — `docs/db/006a_terminal_role.sql` + `docs/db/006_restaurante.sql` (APLICADAS)

- **Core:**
  - `sales.tip_amount`, `sales.source`;
  - tablas `staff_members`, `staff_pins`, `staff_sessions`, `staff_pin_failures`;
  - funciones `staff_login`, `current_staff`, `staff_logout`, `set_staff_pin`, `staff_members_with_pin` y
    `require_staff` (interna).
- **Restaurante:**
  - tablas `dining_areas`, `dining_tables`, `menu_categories`, `menu_items`, `modifier_groups`, `modifiers`,
    `menu_item_modifier_groups`, `orders`, `order_items`;
  - RLS: el equipo lee, la dueña escribe el catálogo, el superadmin todo. **Órdenes solo vía RPC.**
- **RPC:**

  | Función | Permiso que exige |
  |---|---|
  | `open_order`, `add_order_item`, `request_bill` | `orders.take` |
  | `send_order_to_kitchen` | `orders.send` |
  | `set_order_item_status` | depende del estado destino |
  | `close_order` | `payments.collect` (+ `orders.discount`) |
  | `cancel_order` | `orders.cancel` |
  | `set_menu_item_available` | `menu.availability` |

- Correcciones respecto a la SQL original:
  - `close_order` numera `sale_number` por org con el mismo advisory lock que `register_sale`. Antes fallaba
    siempre, porque la columna es NOT NULL sin default.
  - Valida que el cliente sea de la org.
  - Los modificadores deben ser de los grupos del platillo y respetar min/max.
  - Las órdenes cerradas y los ítems anulados son finales.
  - `order_number` por org.
  - Policies de superadmin.
  - Sin `EXECUTE` para `anon`.
- Realtime publicado: `orders`, `order_items`, `dining_tables`.
- Tipos agregados **a mano** en `types/database.ts`. **No** correr `supabase gen types >` (borra extensiones).
- Prueba: `scripts/test_006_restaurante.sql` (45 casos; se revierte sola).

---

## 5. Pantallas

Las que tienen ✔ ya existen. Las demás son de los siguientes pasos de R1.

| Ruta | Grupo | Quién | Qué hace |
|---|---|---|---|
| `/salon` | `(restaurante)` | owner, terminal + PIN | **Pantalla principal.** Mapa de mesas por área con color + texto (Libre, Ocupada, Cuenta pedida), tiempo abierto y total parcial. Tocar mesa libre abre orden; tocar mesa ocupada muestra la orden. Botón "Para llevar". *(placeholder ✔)* |
| `/orden/[id]` | `(restaurante)` | PIN | Menú en grid por categoría (tabs). Platillo con modificadores abre un sheet; si no tiene, se agrega directo. CTA **"Enviar a cocina"** (solo pendientes). "Pedir cuenta", "Cobrar". Optimistic UI. |
| `/cocina` | `(restaurante)` | PIN | KDS para tablet horizontal, modo oscuro, Realtime + sonido, la más antigua primero. "Preparando" → "Listo". *(placeholder ✔)* |
| `/cobrar/[id]` | `(restaurante)` | PIN | Pre-cuenta imprimible a 80 mm, descuento, propina, método de pago, cliente opcional. Llama a `close_order`. |
| `/equipo` | `(owner)` | owner | Equipo, puestos, permisos y PINs. ✔ |
| `/menu` | `(owner)` | owner | Categorías, platillos (precio, costo, foto, estación), modificadores. Toggle rápido "Agotado". |
| `/mesas` | `(owner)` | owner | Áreas y mesas. |
| `/caja` | `(owner)` | owner | Reutiliza el cierre de caja del Core. |
| `/reportes` | `(owner)` | owner | Ventas por día y hora, platillos top, por categoría, ticket promedio, por mesero, canceladas. |

Impresión: CSS `@media print` a 80 mm con `window.print()`. Sin drivers de impresora en esta fase.

---

## 6. Roadmap del vertical

**R1 — MVP para la clienta**
1. ✔ Migración 006 + tipos + rol `terminal` + equipo con PIN + navegación por módulos y rol.
2. Admin de menú y mesas (`/menu`, `/mesas`) + seed con el menú real de la clienta.
3. `/salon` con mapa de mesas y estados.
4. `/orden/[id]` con modificadores y envío a cocina.
5. `/cocina` con Realtime.
6. `/cobrar/[id]` + pre-cuenta imprimible.
7. Cierre de caja (reutilizado) + `/reportes`.
8. UI de cancelación de orden e ítems con PIN de supervisor. Las RPC ya existen.

**R2:**
- dividir cuenta;
- para llevar / delivery con datos del cliente;
- menú QR público;
- transferir o unir mesas.

**R3:**
- insumos, recetas y food cost;
- reservas;
- resumen diario por WhatsApp.

No empezar R2 sin que la clienta haya usado R1 en servicio real al menos una semana.

---

## 7. Pendientes conocidos (antes de R1.7)

- `/caja` calcula "hoy" en UTC (`toISOString()`). En Nicaragua (UTC−6) las ventas después de las 6 pm caen al día
  siguiente, y eso le pega fuerte a un restaurante nocturno.
- **Propina vs. cuadre:** `sales.total` no incluye `tip_amount`, pero la propina en efectivo sí entra al cajón.
  Hay que decidirlo con la clienta.
- `cancel_sale` sobre una venta de restaurante no revierte la orden.

---

## 8. Supuestos a validar con la clienta (PREGUNTAR antes de asumir)

- ¿Quién cocina y cómo recibe la comanda: tablet o ticket impreso? Define la prioridad de `/cocina`.
- ¿Cuántos dispositivos y cuáles: celular del mesero, tablet de caja, tablet de cocina?
- ¿Los kioscos funcionan como mesas normales?
- ¿Cobra propina o cargo de servicio fijo (ej. 10%)?
- ¿Moneda: córdobas, dólares o ambas?
- ¿Factura fiscal? Fuera de R1.
- ¿Dividen cuentas con frecuencia? Si es así, "dividir cuenta" sube a R1.

## 9. Guardrails

- El precio de cada ítem lo fija la BD, nunca el frontend.
- Una mesa, una orden abierta (índice único parcial).
- Cada orden cobrada genera exactamente una fila en `sales`.
- `terminal` nunca ve reportes, costos, ventas ni caja (RLS + nav + layouts).
- El hash del PIN nunca sale de la BD; el token de sesión nunca llega al JavaScript del navegador.
- No construir R2/R3 "ya que estamos".
- Después de cada paso de R1: detenerse, resumir y validar con la clienta.
