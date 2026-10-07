# CONTEXTO.md — Nexo (v3)

> Contexto maestro del proyecto. Léelo completo antes de escribir código.
> Toda la **UI en español**. Código y comentarios en **inglés**.
> v3 reemplaza a v2: la visión pasa de "profundidad para un cliente" a **plataforma SaaS multi-vertical**. La clienta original del colectivo dejó de responder; el colectivo queda como primer vertical terminado y vendible, y el foco es la maquinaria de plataforma.

---

## 1. La visión

Nexo es un SaaS de gestión para PYMEs de **cualquier rubro**: tiendas colectivas (consignación), tiendas de conveniencia/ropa (retail, con catálogo web), restaurantes (mesas, comandas, cocina). No se construye "un sistema para todo negocio": se construye un **core común + módulos activables**, y cada vertical es solo un *preset* de módulos + configuración + sus pantallas propias.

```
NEXO CORE (se construye una vez)
  organizaciones y roles · productos e inventario · POS y ventas
  clientes · caja y cierres · reportes · facturación (futuro) · catálogo web (futuro)

VERTICALES (presets de módulos + pantallas propias)
  colectivo    → + marcas, liquidaciones, cuotas      [EN PRODUCCIÓN]
  retail       → + variantes, e-commerce, tienda web  [SIGUIENTE]
  restaurante  → + mesas, comandas, cocina, delivery  [EN CONSTRUCCIÓN — clienta real, ver docs/RESTAURANTE.md]
```

Reglas de arquitectura:
1. **Multi-tenant siempre**: toda tabla de negocio lleva `organization_id`; RLS en dos niveles (organización → rol). Cruzar datos entre orgs o entre marcas = bug crítico de seguridad.
2. **Módulos sobre silos**: `organizations.enabled_modules` (text[]) decide qué ve cada negocio. La navegación se genera desde los módulos (`lib/modules.ts`), no hay sidebars hardcodeados por tipo de negocio. `organizations.vertical` es solo el preset inicial.
3. **La redirección la decide la organización, no el usuario**: login → profile (rol) → org (vertical/módulos) → home (`lib/home-route.ts`). El rol decide qué puede hacer dentro.
4. **Configuración sobre código**: moneda, tasa de cambio, modelo de cobro, periodo, módulos — todo vive en `organizations`, nada hardcodeado.
5. **Core no importa del vertical.** Un archivo genérico jamás importa lógica de colectivo/restaurante.

---

## 2. Estado actual (jun 2026)

**Construido y en producción** (https://nexo-tienda.vercel.app):
- Multi-tenant completo: `organizations`, RLS por org, roles `superadmin | owner | brand`, panel superadmin (`app/(admin)`) con creación de negocios y usuarios.
- Colectivo completo: POS con venta atómica (`register_sale`), inventario, clientes, reportes por marca, liquidaciones con PDF, **cierre de caja diario** (A1), **estado de cuenta por marca** con `brand_payments` (A2).
- Moneda configurable con conversión real NIO↔USD (`lib/money.ts`, `getMoney()`/`useMoney()`).
- **Sistema de módulos** (Fase B parcial): registro en `lib/modules.ts`, contexto en `lib/org-context.ts`, guards `requireModule()`, navegación dinámica, gestión de módulos por org en el admin.

**Oct 2026 — vertical restaurante adelantado** (llegó clienta real; detalle en `docs/RESTAURANTE.md`):
- Migraciones `006a_terminal_role` + `006_restaurante` aplicadas: tablas del restaurante + órdenes por RPC atómicas.
- **Equipo con PIN (Core, sirve a cualquier vertical):** rol de auth `terminal` = "cuenta del local" abierta una vez
  por dispositivo; cada empleado opera con PIN de 4 dígitos y permisos por puesto (`staff_members`,
  `lib/permissions.ts`, `lib/staff-session.ts`). Toda RPC operativa exige sesión de PIN.
- Navegación unificada en `components/nav-items.ts` (filtrada por módulo **y** rol) y shell compartido
  `components/app-shell.tsx`. Todo redirect de rol pasa por `/` → `homeRoute(role, vertical)`.
- Módulos nuevos `restaurant` y `kitchen`; preset restaurante = `restaurant, customers, cash` (`kitchen` opcional por org).
- `organizations.timezone` (007) + `lib/dates.ts`: "hoy" se calcula en la hora local del negocio.

**Movimiento en la interfaz** (`app/globals.css`, sección MOVIMIENTO):
- `template.tsx` por grupo de rutas: cada página entra con `animate-page`.
- `loading.tsx`: esqueletos al navegar.
- `NavPending` (`useLinkStatus`): aviso inmediato en el menú al tocar un enlace.
- `AnimatedNumber`: los montos cuentan hasta el nuevo valor.
- `animate-enter` con `--i`: entrada escalonada.
- `animate-shake`, `animate-pop`, `animate-grow`, `animate-check` para errores, confirmaciones y barras.
- Botones con escala al presionar.
- Todo respeta `prefers-reduced-motion`.

**Deuda / pendientes conocidos:**
- ✔ `register_sale`/`cancel_sale` protegidos (014) y UPDATE de `organizations` solo para la dueña y columnas de
  configuración (012).
- Activar "Leaked password protection" en Supabase Auth (aviso del advisor).
- Páginas del colectivo (ventas, liquidaciones, reporte por marca, portal de marca) aún calculan fechas en UTC.
- La clienta nunca definió la regla de cobro de cuotas → `brand_payments` es un libro manual flexible; automatizar cuando haya regla.
- `products.brand_id` y `sale_items.brand_id` son NOT NULL (herencia colectivo). Para retail hay que hacerlos nullable y ajustar POS/formularios. **Hacerlo al construir retail, no antes.**
- Separación física `lib/core/` vs `lib/colectivo/` aún no hecha (la separación lógica vía módulos sí).
- Portal de marca (A3) incompleto; alertas de stock en dashboard sí existen.
- ⚠️ El proyecto Supabase es plan gratuito y **se pausa por inactividad** → producción se cae. Para vender esto se necesita plan Pro.

**Historia de BD** en `docs/db/` (correr en orden en una base nueva): `000_schema_base` → `001_multitenant` → `002_cash_closures` → `003_brand_payments` → `004_platform_modules` → `005_fix_handle_new_user` → `006a_terminal_role` (sola) → `006_restaurante` → `007_org_timezone` → `008_orden_ui` → `009_pagos_divididos` → `010_order_payments_read` → `011_reportes` → `012_ticket_info_y_org_update` → `013_kitchen_tickets` → `014_harden_sales_rpcs` → `015_cash_openings` → `016_cobro_requiere_caja_abierta`.

---

## 3. Stack

Next.js 16 (App Router, proxy en vez de middleware) · TypeScript strict · Supabase (Postgres + Auth + RLS) · Tailwind v4 + shadcn/ui (**base-ui**: inputs controlados, sin `asChild`) · Vercel (auto-deploy desde `main`) · Zod · Sora + Plus Jakarta Sans · Tokens: azul #1B4FFF, naranja #FF5C1A (solo CTAs). Mobile-first siempre.

Convenciones: Server Components para lectura; mutaciones críticas = funciones Postgres atómicas o Server Actions con `getOrgId()`; tipos de BD mantenidos a mano en `types/database.ts`; montos siempre en NIO en la BD y formateados con `fmt()`.

---

## 4. Roadmap por compuertas (no fechas)

No se pasa de etapa sin cruzar la compuerta. Esto protege el foco.

**Etapa 1 — Cerrar Colectivo como producto vendible**
Terminar A3 (portal de marca) y pulir onboarding. Ya no depende de la clienta original: el vertical queda listo para venderse a cualquier colectivo.
→ *Compuerta: montar un colectivo demo completo sin tocar código.*

**Etapa 2 — Maquinaria de plataforma (Fase B)** ← EN CURSO
Sistema de módulos ✔ · navegación dinámica ✔ · admin de módulos ✔ · redirect central ✔. Falta: signup self-service (registro → crea org → elige tipo de negocio), facturación básica core, separación física core/vertical.
→ *Compuerta: un desconocido puede registrarse y operar su negocio sin intervención manual.*

**Etapa 3 — Vender**
2–3 clientes pagando (colectivos u otros que quepan en los módulos actuales). En paralelo: catálogo web público como módulo transversal.
→ *Compuerta: ingreso mensual estable.*

**Etapa 4 — Vertical retail completo**
Variantes de producto (talla/color), `brand_id` nullable, catálogo web con carrito, códigos de barras. Reutiliza ~80% del core.

**Etapa 5 — Vertical restaurante** ← ADELANTADA (oct 2026, clienta real)
POS propio (mesas, comandas, cocina en tiempo real, delivery). Roadmap R1/R2/R3 en `docs/RESTAURANTE.md`.

---

## 5. Guardrails

- RLS activo en toda tabla nueva, con policies owner/brand/superadmin filtrando por `organization_id`.
- Acciones operativas en dispositivos compartidos: RPC con `p_staff_token` + `require_staff(token, permiso)`; nunca confiar en quién dice el cliente que es.
- `service_role key` jamás al navegador.
- Toda pantalla de módulo lleva `requireModule()` además del filtro de navegación (defensa en profundidad).
- No construir features de un vertical futuro "ya que estamos".
- Preguntar antes de asumir reglas de negocio no documentadas.
- Después de cada etapa: detenerse, resumir, actualizar este documento.
