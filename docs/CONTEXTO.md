# CLAUDE.md — Nexo Colectivo (v2)

> Contexto maestro del proyecto. Léelo completo antes de escribir código.
> Toda la **UI en español**. Código y comentarios en **inglés**.
> Esta versión reemplaza a la anterior: el sistema ya tiene un MVP funcional y ahora entra en fase de **profundidad + arquitectura de plataforma**.

---

## 1. Estado actual del proyecto

El MVP está construido y funcionando (Next.js 15 + Supabase + Vercel):

- Login con roles (dueña / marca) y RLS
- Dashboard: ventas del día, marcas activas, productos activos, reporte quincenal, top productos
- Punto de venta: búsqueda por código o nombre, carrito, descuentos por línea y total, método de pago (efectivo/POS/transferencia), venta atómica vía RPC `register_sale`
- Inventario: CRUD de productos por marca, toggle activo, ajuste de stock
- Liquidaciones: reporte quincenal por marca con PDF imprimible, incluye **cuota por espacio**
- Clientes: registro básico
- Marcas: gestión básica

**Dato clave del negocio real:** la clienta NO cobra comisión por venta. Cobra una **cuota fija por espacio** (ej. C$740 por quincena) a cada marca. El sistema ya lo refleja. Sin embargo, el modelo de cobro debe seguir siendo **configurable** (cuota fija, comisión %, o mixto) porque futuros clientes usarán otros modelos.

---

## 2. La visión: Nexo como plataforma

Este proyecto no es un sistema para una tienda. Es el primer vertical de una plataforma:

```
NEXO CORE (común a todo negocio)
├── productos, inventario, POS, ventas, clientes
├── usuarios, roles, organizaciones (multi-tenant)
├── reportes y dashboard
│
├── NEXO COLECTIVO  ← estamos aquí
│   └── marcas, liquidaciones, cuotas/comisiones, portal de marca
├── NEXO RESTAURANTE (futuro)
│   └── mesas, comandas, cocina, menú QR
└── NEXO COURIER (futuro)
    └── paquetes, tracking, estados de envío
```

Implicaciones para CADA decisión de código:

1. **Multi-tenant desde ya.** Toda tabla de datos de negocio lleva `organization_id`. Hoy existe una sola organización (la tienda de la clienta), pero el segundo cliente debe poder montarse sin tocar código.
2. **Separación Core vs. Vertical.** Lo genérico (productos, ventas, POS) no debe importar nada de lo específico de colectivos (marcas, liquidaciones). Estructura de carpetas refleja esto.
3. **Configuración sobre código.** Moneda, modelo de cobro, periodo de liquidación, nombre y logo del negocio viven en `organization_settings`, nunca hardcodeados.

---

## 3. Principio rector: profundidad antes que anchura

El MVP registra datos. La fase actual lo convierte en algo por lo que vale la pena pagar mensualidad. La vara para cada feature:

> ¿Esto le evita a la dueña una tarea que odia, o le da información que la hace ganar dinero?

Un CRUD no pasa la vara. Un cierre de caja que cuadra solo, sí. Una alerta de "esta marca no vende hace 20 días", sí.

---

## 4. Stack (sin cambios)

Next.js 15 (App Router) · TypeScript strict · Supabase (Postgres, Auth, RLS, Storage) · Tailwind + shadcn/ui · Vercel · Zod · Sora + Plus Jakarta Sans · Tokens Nexo: azul #1B4FFF, naranja #FF5C1A (solo CTAs), casi negro #0F0F0F, blanco hueso #F5F5F3, gris #6B7280. Mobile-first siempre (el POS se usa en el mostrador desde tablet/celular).

---

## 5. Arquitectura multi-tenant

### Modelo
- **organizations** — cada negocio que usa Nexo. Campos: `id`, `name`, `slug`, `vertical` (`colectivo` | `restaurante` | `courier`), `active`.
- **organization_settings** — configuración por negocio: `currency` (`NIO`|`USD`), `billing_model` (`space_fee`|`commission`|`mixed`), `space_fee_amount`, `settlement_period` (`biweekly`|`monthly`), `logo_url`, etc.
- **profiles** gana `organization_id`. Un usuario pertenece a una organización.
- Todas las tablas de negocio (`brands`, `products`, `customers`, `sales`, `sale_items`, `settlements`) ganan `organization_id not null`.

### RLS en dos niveles
1. **Nivel organización:** nadie ve datos de otra organización. Helper `current_org_id()` lee el `organization_id` del profile del usuario autenticado; toda policy lo filtra.
2. **Nivel rol (dentro de la org):** owner ve todo lo de su org; brand ve solo lo suyo (igual que hoy).

> Regla de oro ampliada: cruzar datos entre organizaciones o entre marcas es bug crítico de seguridad. Toda policy filtra primero por `organization_id`, luego por rol.

### Migración
El SQL de migración está en `migration_001_multitenant.sql`. Pasos: crear `organizations` y `organization_settings` → insertar la organización de la clienta actual → agregar `organization_id` a todas las tablas con backfill a esa organización → `not null` + índices → reescribir las policies con el filtro de organización → actualizar `register_sale` para recibir/validar `organization_id`.

### Estructura de carpetas objetivo
```
app/
  (auth)/            login, recuperación
  (owner)/           rutas de la dueña
  (brand)/           portal de marca
lib/
  core/              lógica genérica (productos, ventas, clientes, caja)
  colectivo/         lógica del vertical (marcas, liquidaciones, cuotas)
  supabase/          clientes server/browser, tipos generados
components/
  core/ · colectivo/ · ui/
```

---

## 6. Roadmap (en orden estricto)

### Fase A — Profundidad para la clienta actual ⬅ EMPEZAR AQUÍ
Es lo que justifica el precio. En orden de impacto:

**A1. Cierre de caja diario.**
Ritual de fin de día: el sistema muestra lo esperado por método de pago (efectivo / POS / transferencia) según las ventas del día; la dueña ingresa lo contado real; el sistema marca diferencia (cuadre/descuadre) y guarda el cierre con nota opcional. Tabla `cash_closures`: `id, organization_id, date, expected_cash, counted_cash, expected_pos, expected_transfer, difference, notes, closed_by, created_at`. Vista de historial de cierres. Si hay descuadre, mostrarlo en rojo con el monto.

**A2. Estado de cuenta por marca.**
Convertir la pestaña Marcas en mini-CRM: por cada marca, saldo acumulado — ventas del periodo, cuotas generadas, cuotas pagadas, saldo pendiente — e historial de liquidaciones y pagos. Tabla `brand_payments`: `id, organization_id, brand_id, settlement_id (nullable), amount, type ('payout'|'fee_charge'|'fee_payment'), method, notes, created_at`. La dueña registra cuándo la marca pagó su cuota y cuándo ella le pagó a la marca lo vendido.

**A3. Portal de marca (activar/completar).**
Login por marca con dashboard: sus ventas en tiempo real, su stock, sus liquidaciones, su estado de cuenta. Solo lectura excepto su inventario (puede editar sus productos). Validar RLS a fondo: una marca jamás ve otra marca.

**A4. Alertas de stock bajo en dashboard.**
Card en el panel de la dueña y en el portal de cada marca: productos con `stock <= low_stock_threshold`. (WhatsApp viene en Fase C, no ahora.)

### Fase B — Refactor multi-tenant
Ejecutar `migration_001_multitenant.sql`, actualizar tipos, helpers RLS, queries y la función `register_sale`. Probar exhaustivamente que la app sigue funcionando igual para la clienta. Construir `organization_settings` y reemplazar todo valor hardcodeado (moneda, cuota, periodo) por lecturas de settings.

> ¿Por qué B después de A? La clienta necesita valor YA para validar el producto y pagar. El refactor es invisible para ella. Pero NO empieces la Fase C sin haber hecho B: cada feature nueva post-B nace multi-tenant.

### Fase C — Inteligencia y retención
- **C1. Dashboard inteligente:** comparativa mes actual vs. anterior, marcas sin ventas en 15/30 días, productos sin rotación en 30 días.
- **C2. WhatsApp (Twilio):** liquidación lista → link a la marca; resumen semanal a la dueña; alerta de stock crítico. Plantillas configurables por organización.
- **C3. Exportar a Excel** además de PDF.

### Fase D — Plataforma
- **D1. Onboarding wizard:** crear organización nueva (nombre, vertical, moneda, modelo de cobro) sin tocar código.
- **D2. Panel super-admin** para Nexo (ver organizaciones, activar/desactivar).
- Solo cuando haya 2-3 colectivos pagando se evalúa el segundo vertical.

---

## 7. Convenciones (sin cambios + adiciones)

- TypeScript strict, sin `any`. Tipos generados con `supabase gen types`.
- Server Components para lectura; Client solo para interactividad.
- `service_role key` jamás al navegador.
- Mutaciones críticas (ventas, cierres, liquidaciones, pagos) = funciones Postgres atómicas llamadas desde el servidor.
- Validación con Zod en todo formulario.
- Montos siempre redondeados a 2 decimales al mostrar; usar `Intl.NumberFormat('es-NI', { style: 'currency', currency: settings.currency })`.
- Toda query de negocio filtra por `organization_id` (post Fase B). Nunca confiar solo en RLS: defensa en profundidad.
- Después de cada fase: detenerse, resumir lo construido, listar qué validar con la clienta.

---

## 8. Guardrails

- RLS siempre activo, en dos niveles (organización → rol).
- `billing_model` configurable: cuota fija, comisión % o mixto. La clienta actual usa cuota fija; no asumir que todos los clientes serán así.
- Core no importa de Colectivo. Si un archivo en `lib/core/` importa algo de `lib/colectivo/`, está mal diseñado.
- No construir features del vertical Restaurante/Courier "ya que estamos". Foco.
- Preguntar antes de asumir reglas de negocio no documentadas aquí.
