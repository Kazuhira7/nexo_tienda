# Nexo Colectivo

Sistema de gestión para **tiendas colectivas** (modelo de consignación): un local donde
varias marcas independientes venden bajo un mismo techo. La dueña vende en nombre de las
marcas y lleva control centralizado de inventario, ventas, clientes, liquidaciones, cierre
de caja y estado de cuenta por marca.

Producto de la agencia **Nexo**. Arquitectura **multi-tenant** (varias tiendas en la misma
base), pensado para revenderse a otras tiendas colectivas.

- **Producción:** https://nexo-tienda.vercel.app
- **Contexto y rumbo del proyecto:** [`docs/CONTEXTO.md`](docs/CONTEXTO.md) ← **léelo primero**

---

## Stack

Next.js 16 (App Router) · TypeScript strict · Supabase (Postgres + Auth + RLS + Storage) ·
Tailwind CSS v4 + shadcn/ui (base-ui) · Vercel · Zod.

> ⚠️ Esta versión de Next.js tiene cambios importantes vs. lo conocido. Antes de escribir
> código, revisa `AGENTS.md` y la guía en `node_modules/next/dist/docs/`.

---

## Puesta en marcha

```bash
git clone https://github.com/Kazuhira7/nexo_tienda.git
cd nexo_tienda
npm install
cp .env.example .env.local   # luego rellena las llaves reales (ver abajo)
npm run dev                  # http://localhost:3000
```

### Variables de entorno

Copia `.env.example` a `.env.local` y pídele las llaves al dueño del proyecto
(están en Supabase → Project Settings → API). **Nunca** se suben a GitHub:

| Variable | Dónde | Notas |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | navegador + servidor | URL del proyecto |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | navegador | segura (protegida por RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | **solo servidor** | secreta, jamás al cliente |

---

## Base de datos

El esquema vive en Supabase. La historia de SQL está en [`docs/db/`](docs/db/), en orden:

1. `000_schema_base.sql` — esquema inicial (tablas, RLS, función `register_sale`)
2. `001_multitenant.sql` — migración a multi-tenant (`organizations`, `organization_id`, RLS por org)
3. `002_cash_closures.sql` — cierre de caja diario (Fase A1)
4. `003_brand_payments.sql` — estado de cuenta por marca (Fase A2)

Para una base **nueva**, correrlos en orden en el SQL Editor de Supabase. La base actual
ya los tiene aplicados todos.

Tras cambios de esquema, regenerar tipos:

```bash
npx supabase gen types typescript --project-id <project-id> > types/database.ts
```

---

## Estructura

```
app/(auth)/     login y recuperación
app/(owner)/    rutas de la dueña (dashboard, ventas, inventario, marcas, caja, liquidaciones…)
app/(brand)/    portal de marca
app/(admin)/    panel super-admin (Nexo)
components/     UI por dominio + components/ui (shadcn)
lib/            supabase clients, helpers de moneda, etc.
types/          tipos de la BD (generados)
docs/           CONTEXTO.md (visión) + db/ (historia SQL)
```

## Convenciones

- **UI en español**, código y comentarios en inglés.
- Server Components para lectura; Client solo para interactividad.
- Mutaciones críticas (ventas, cierres, pagos) vía funciones Postgres atómicas / Server Actions.
- RLS siempre activa, en dos niveles: organización → rol. Una marca jamás ve datos de otra.
- Mobile-first (el punto de venta se usa en el mostrador desde celular/tablet).

## Despliegue

Conectado a Vercel: cada push a `main` despliega automáticamente a producción.
Las variables de entorno de producción están configuradas en el dashboard de Vercel.
