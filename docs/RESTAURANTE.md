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

**Respuestas de la clienta (2 oct 2026):**
- Hoy toma pedidos en papel y lleva la comanda de papel a cocina.
- Los kioscos funcionan igual que las mesas (con número).
- Vende para llevar; no hace delivery.
- Calcula unas 4–5 mesas al día. Abre todos los días de 8 am a 10 pm.
- Tiene 17 platillos y el menú no cambia. Cobra extras de comida con costo. No tiene combos.
- Solo maneja córdobas.
- Acepta efectivo, POS y transferencia.
- **Sí divide cuentas** (grupos). **No cobra propina.**
- Por ahora no quiere inventario.
- Tiene **una computadora y una tablet**. No tiene impresora térmica (quiere comprar una). Tiene buen internet.
- **Lo necesita antes del 1 de noviembre 2026.** Presupuesto: barato.

**Prioridad de diseño: velocidad.** El mesero toma una orden completa en el celular, con una mano, de pie junto a la
mesa. Si una acción frecuente toma más de 3 toques, está mal diseñada.

---

## 2. Cómo encaja en la plataforma (v3)

- La org tiene `organizations.vertical = 'restaurante'`. Es solo el preset inicial.
- **Lo que se ve lo deciden los módulos** (`organizations.enabled_modules`, `lib/modules.ts`):
  - `restaurant`: salón, órdenes, cobro, menú, mesas y equipo.
  - `kitchen`: pantalla de cocina. Va aparte porque algunos negocios usan ticket impreso.
  - Preset del vertical: `restaurant, customers, cash`. No incluye `pos` ni `inventory`, porque el POS
    colectivo exige `brand_id`. `kitchen` (pantalla de cocina) se activa por org cuando haya un dispositivo
    en cocina; la primera clienta no lo tiene.
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
  | `pay_order` (009, reemplaza a `close_order`) | `payments.collect` |
  | `set_order_discount` (009) | `orders.discount` |
  | `update_order_item`, `set_order_guests` (008) | `orders.take` |
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
- **008:** `orders.customer_name` (para llevar), `open_order(…, p_customer_name)`, `update_order_item` (cantidad y
  notas de lo no enviado), `set_order_guests`.
- **009 — cuenta dividida:** una orden admite varios pagos (`pay_order`); cada pago es una fila en `sales` con
  `order_id` y su método. El primer pago lleva el descuento de la orden (`orders.discount_total`), así que
  `sum(sales.total)` = total de la orden. La orden se cierra y la mesa se libera cuando el saldo llega a 0. No se
  puede cancelar una orden con pagos ni anular platillos por debajo de lo ya cobrado.
- **010:** `order_payments(order_id)` deja al equipo ver los pagos de una orden sin leer `sales`.
- **011:** `restaurant_report(desde, hasta)` (solo dueña). Reporte completo en la zona horaria del negocio: ventas,
  por día/hora/método, platillos, categorías, meseros, cancelaciones, anulaciones y órdenes cerradas.
- **012:** datos del ticket (`organizations.ticket_address/phone/tax_id/footer`).
  - **Seguridad:** la policy de UPDATE de `organizations` solo exigía misma org. Una marca o la cuenta del local
    podía cambiar el negocio (incluso módulos y vertical). Ahora solo la dueña puede, y solo las columnas de
    configuración.
- **013:** `kitchen_tickets`.
  - `send_order_to_kitchen` crea un ticket por ronda con lo enviado: cocina primero, barra al final.
  - `mark_kitchen_ticket_printed` y `reprint_kitchen_ticket` son para la estación (sin PIN, solo equipo).
  - La tabla está en Realtime.
- **014 (Core):** `register_sale` y `cancel_sale` ya no se pueden ejecutar sin sesión.
  - Solo la dueña puede usarlas; la org y el vendedor salen de la sesión.
  - Se borró la versión vieja de 4 argumentos.
  - Los helpers tienen `search_path` fijo.
- Pruebas: `scripts/test_006_restaurante.sql` (45 casos) y `scripts/test_009_pagos.sql` (008/009). Para 011–014
  se corrieron pruebas equivalentes en un bloque que se revierte (ver el historial del commit). Ambas se
  revierten solas.

---

## 5. Pantallas

Las que tienen ✔ ya existen. Las demás son de los siguientes pasos de R1.

| Ruta | Grupo | Quién | Qué hace |
|---|---|---|---|
| `/salon` | `(restaurante)` | owner, terminal + PIN | **Pantalla principal.** Mapa de mesas por área con color + texto (Libre, Ocupada, Cuenta pedida), tiempo abierto y total parcial. Tocar mesa libre abre orden; tocar mesa ocupada muestra la orden. Botón "Para llevar". Realtime entre dispositivos. ✔ |
| `/orden/[id]` | `(restaurante)` | PIN | Menú en grid por categoría (tabs). Platillo con modificadores abre un sheet; si no tiene, se agrega directo. CTA **"Enviar a cocina"** (solo pendientes). "Pedir cuenta", "Cobrar". Optimistic UI, personas, editar cantidades de lo no enviado, anular con PIN de supervisor, cancelar orden con motivo. ✔ |
| `/cocina` | `(restaurante)` | PIN | KDS para tablet horizontal, modo oscuro, Realtime + sonido, la más antigua primero. "Preparando" → "Listo". *(placeholder ✔)* |
| `/cobrar/[id]` | `(restaurante)` | PIN | Pre-cuenta/recibo imprimible a 80 mm, descuento (monto o %), **cuenta dividida** (todo, entre 2/3/4, por platillos), método por pago, vuelto en efectivo. Llama a `pay_order`. ✔ |
| `/equipo` | `(owner)` | owner | Equipo, puestos, permisos y PINs. ✔ |
| `/menu` | `(owner)` | owner | Categorías, platillos (precio, costo, estación), extras y opciones con precio. Toggle rápido "Agotado". ✔ |
| `/mesas` | `(owner)` | owner | Áreas y mesas; alta en lote ("Mesa 1…10"). ✔ |
| `/caja` | `(owner)` | owner | Reutiliza el cierre de caja del Core. |
| `/reportes` | `(owner)` | owner | Ventas por día y hora, platillos top, por categoría, ticket promedio, por mesero, canceladas. |

Impresión: CSS `@media print` a 80 mm con `window.print()`. Sin drivers de impresora en esta fase.

---

## 6. Roadmap del vertical

**R1 — MVP para la clienta (entrega antes del 1 nov 2026)**

Ajustado a sus respuestas: no hay dispositivo en cocina, así que la comanda se imprime y la pantalla de cocina pasa
a R2. Dividir cuenta entra a R1. No hay propina.

1. ✔ Migración 006 + tipos + rol `terminal` + equipo con PIN + navegación por módulos y rol.
2. ✔ `/menu` y `/mesas` + zona horaria por org (007), con `/caja` y `/dashboard` en hora local.
   Falta: cargar el menú real (esperando foto) y crear la org de la clienta.
3. ✔ `/salon` (mapa de mesas) + `/orden/[id]` en la tablet, con extras y "para llevar" (nombre del cliente).
4. ✔ **Estación de impresión** (`/impresion`) en la computadora: imprime sola cada comanda enviada a cocina (Realtime + Chrome
   `--kiosk-printing`, ticket de 80 mm). También pre-cuenta y recibo.
5. ✔ `/cobrar/[id]` con **cuenta dividida**: una orden admite varios pagos, cada uno es una fila en `sales` con su
   método (migración 009). La caja sigue cuadrando por método sin cambios.
6. ✔ Reportes (`/reportes`) + Inicio de restaurante + configuración con datos del ticket + app instalable (PWA).
7. Prueba en el local, capacitación y margen para imprevistos.

**Semanas:**

| Semana | Pasos |
|---|---|
| 1 | 1–2 |
| 2 | 3 |
| 3 | 4–5 |
| 4 | 6–7 |

**R2:**
- pantalla de cocina (`/cocina`, módulo `kitchen`) para negocios con tablet en cocina;
- delivery con datos del cliente;
- menú QR público;
- transferir o unir mesas.

**R3:**
- insumos, recetas y food cost;
- reservas;
- resumen diario por WhatsApp.

No empezar R2 sin que la clienta haya usado R1 en servicio real al menos una semana.

---

## 6b. Instalación en el local

**Tablet (mesero):**
1. Abrir Nexo en Chrome (Android) o Safari (iPad).
2. Iniciar sesión con la **cuenta del local**.
3. Usar "Agregar a pantalla de inicio" (Android) o Compartir → "Agregar a inicio" (iPad).
4. Se abre como app en pantalla completa y entra directo al salón.

**Computadora (caja + impresora):**
1. Instalar la impresora térmica de 80 mm y dejarla como **predeterminada**.
2. Crear un acceso directo de Chrome con `--kiosk-printing` al final del Destino. Así imprime sin preguntar.
3. Abrir Nexo con ese acceso directo, iniciar sesión con la cuenta del local y entrar a **Impresión** (`/impresion`).
   Tocar "Imprimir prueba".
4. Dejar esa pestaña abierta durante el servicio. Cada "Enviar a cocina" imprime su comanda y "Reimprimir" la saca
   de nuevo. En otra pestaña se usa el salón y el cobro (pre-cuenta y recibo).

## 7. Pendientes conocidos

- ✔ `/caja` y `/dashboard` ya calculan "hoy" en la zona horaria de la org (`organizations.timezone`,
  `lib/dates.ts`). Faltan las páginas del colectivo (ventas, liquidaciones, reportes por marca y portal de marca).
- `cancel_sale` sobre una venta de restaurante no revierte la orden.
- ✔ `register_sale` y `cancel_sale` (Core) protegidos (014).

## 8. Pendiente de la clienta

- **Foto del menú con precios**, incluyendo los extras y su precio.
- Cuántas son mesas y cuántos kioscos, y cómo los numera.
- ¿La tablet es Android o iPad? ¿La computadora es Windows? ¿Está en caja?
- ¿Quién toma la orden en la tablet y quién cobra?
- "Factura": ¿necesita factura fiscal (DGI, fuera de R1) o basta un recibo?
- **Impresora:** térmica de 80 mm, USB (idealmente también LAN), ESC/POS, con corte automático. No comprar
  solo Bluetooth. Confirmar el modelo antes de comprarla.

## 9. Guardrails

- El precio de cada ítem lo fija la BD, nunca el frontend.
- Una mesa, una orden abierta (índice único parcial).
- Cada pago de una orden genera una fila en `sales` (una sola si no se divide la cuenta). La suma de los pagos
  es el total de la orden.
- `terminal` nunca ve reportes, costos, ventas ni caja (RLS + nav + layouts).
- El hash del PIN nunca sale de la BD; el token de sesión nunca llega al JavaScript del navegador.
- No construir R2/R3 "ya que estamos".
- Después de cada paso de R1: detenerse, resumir y validar con la clienta.
