-- ============================================================
-- NEXO COLECTIVO — Migración a Multi-tenant
-- Ejecutar en: Supabase > SQL Editor
-- IMPORTANTE: Correr TODO de una sola vez (es transaccional)
-- ============================================================

BEGIN;

-- ============================================================
-- 1. NUEVOS ENUMS
-- ============================================================

CREATE TYPE settlement_model AS ENUM ('commission', 'space_fee', 'both', 'none');
CREATE TYPE settlement_period_type AS ENUM ('quincenal', 'mensual');
CREATE TYPE currency_code AS ENUM ('NIO', 'USD');

-- Agregar 'superadmin' al enum de roles existente
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'superadmin';

-- ============================================================
-- 2. TABLA ORGANIZATIONS (el "negocio" / tenant)
-- ============================================================

CREATE TABLE organizations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  slug            text NOT NULL UNIQUE,
  currency        currency_code NOT NULL DEFAULT 'NIO',
  settlement_model settlement_model NOT NULL DEFAULT 'space_fee',
  settlement_period settlement_period_type NOT NULL DEFAULT 'quincenal',
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- RLS en organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. INSERTAR ORGANIZACIÓN POR DEFECTO (datos actuales)
-- ============================================================

INSERT INTO organizations (id, name, slug, currency, settlement_model, settlement_period)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Mi Tienda Colectiva',
  'demo',
  'NIO',
  'space_fee',
  'quincenal'
);

-- ============================================================
-- 4. AGREGAR organization_id A TODAS LAS TABLAS
--    (nullable primero para el backfill)
-- ============================================================

ALTER TABLE profiles    ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE brands      ADD COLUMN organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE products    ADD COLUMN organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE customers   ADD COLUMN organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE sales       ADD COLUMN organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE sale_items  ADD COLUMN organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE settlements ADD COLUMN organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';

-- ============================================================
-- 5. BACKFILL: asignar la organización por defecto a todo
-- ============================================================

-- Para profiles, el owner existente va a la org por defecto
-- El superadmin tendrá organization_id NULL (se crea más abajo)
UPDATE profiles SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL AND role != 'superadmin';

-- Quitar el DEFAULT temporal de las tablas que ya lo tienen
ALTER TABLE brands      ALTER COLUMN organization_id DROP DEFAULT;
ALTER TABLE products    ALTER COLUMN organization_id DROP DEFAULT;
ALTER TABLE customers   ALTER COLUMN organization_id DROP DEFAULT;
ALTER TABLE sales       ALTER COLUMN organization_id DROP DEFAULT;
ALTER TABLE sale_items  ALTER COLUMN organization_id DROP DEFAULT;
ALTER TABLE settlements ALTER COLUMN organization_id DROP DEFAULT;

-- Constraint: owner y brand DEBEN tener organization_id; superadmin puede ser NULL
ALTER TABLE profiles ADD CONSTRAINT profiles_org_required
  CHECK (role = 'superadmin' OR organization_id IS NOT NULL);

-- ============================================================
-- 6. AGREGAR commission_rate de vuelta a brands
--    (space_fee ya existe; commission_rate para modelo 'commission' o 'both')
-- ============================================================

ALTER TABLE brands ADD COLUMN IF NOT EXISTS commission_rate numeric(5,2) NOT NULL DEFAULT 0;

-- ============================================================
-- 7. ÍNDICES ÚNICOS POR ORGANIZACIÓN
-- ============================================================

-- products.code: era único global → ahora único por org
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_code_key;
CREATE UNIQUE INDEX products_org_code_unique ON products(organization_id, code);

-- sales.sale_number: era serial global → ahora secuencia por org
-- (register_sale calcula el siguiente número por org)
ALTER TABLE sales ALTER COLUMN sale_number DROP DEFAULT;
DROP SEQUENCE IF EXISTS sales_sale_number_seq;
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_sale_number_key;
CREATE UNIQUE INDEX sales_org_number_unique ON sales(organization_id, sale_number);

-- Índices de performance
CREATE INDEX idx_profiles_org    ON profiles(organization_id);
CREATE INDEX idx_brands_org      ON brands(organization_id);
CREATE INDEX idx_products_org    ON products(organization_id);
CREATE INDEX idx_customers_org   ON customers(organization_id);
CREATE INDEX idx_sales_org       ON sales(organization_id);
CREATE INDEX idx_sale_items_org  ON sale_items(organization_id);
CREATE INDEX idx_settlements_org ON settlements(organization_id);

-- ============================================================
-- 8. CREAR SUPER-ADMIN (alejoprueba@nexo.com)
--    ID del auth user: 6fe76099-2ab6-4ed4-ba8d-7ffefd9a3f08
-- ============================================================

INSERT INTO profiles (id, role, brand_id, full_name, organization_id)
VALUES (
  '6fe76099-2ab6-4ed4-ba8d-7ffefd9a3f08',
  'superadmin',
  NULL,
  'Super Admin Nexo',
  NULL   -- superadmin no pertenece a ningún negocio
)
ON CONFLICT (id) DO UPDATE SET role = 'superadmin', organization_id = NULL;

-- ============================================================
-- 9. FUNCIONES HELPER ACTUALIZADAS
-- ============================================================

-- Obtener la org del usuario autenticado
CREATE OR REPLACE FUNCTION current_org_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid();
$$;

-- Verificar si el usuario es superadmin
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin');
$$;

-- Mantener las existentes (ahora también verifican misma org)
CREATE OR REPLACE FUNCTION current_role_is_owner()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner');
$$;

CREATE OR REPLACE FUNCTION current_brand_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT brand_id FROM profiles WHERE id = auth.uid();
$$;

-- ============================================================
-- 10. REESCRIBIR TODAS LAS POLÍTICAS RLS
-- ============================================================

-- ---------- ORGANIZATIONS ----------
CREATE POLICY orgs_superadmin_all ON organizations FOR ALL
  USING (is_superadmin()) WITH CHECK (is_superadmin());

CREATE POLICY orgs_owner_read ON organizations FOR SELECT
  USING (id = current_org_id());

-- ---------- PROFILES ----------
DROP POLICY IF EXISTS profiles_self_read ON profiles;

CREATE POLICY profiles_self_read ON profiles FOR SELECT
  USING (
    id = auth.uid()
    OR (current_role_is_owner() AND organization_id = current_org_id())
    OR is_superadmin()
  );

CREATE POLICY profiles_superadmin_all ON profiles FOR ALL
  USING (is_superadmin()) WITH CHECK (is_superadmin());

-- ---------- BRANDS ----------
DROP POLICY IF EXISTS brands_owner_all ON brands;
DROP POLICY IF EXISTS brands_brand_read ON brands;

CREATE POLICY brands_owner_all ON brands FOR ALL
  USING (current_role_is_owner() AND organization_id = current_org_id())
  WITH CHECK (current_role_is_owner() AND organization_id = current_org_id());

CREATE POLICY brands_brand_read ON brands FOR SELECT
  USING (id = current_brand_id() AND organization_id = current_org_id());

CREATE POLICY brands_superadmin_all ON brands FOR ALL
  USING (is_superadmin()) WITH CHECK (is_superadmin());

-- ---------- PRODUCTS ----------
DROP POLICY IF EXISTS products_owner_all ON products;
DROP POLICY IF EXISTS products_brand_read ON products;
DROP POLICY IF EXISTS products_brand_write ON products;
DROP POLICY IF EXISTS products_brand_insert ON products;

CREATE POLICY products_owner_all ON products FOR ALL
  USING (current_role_is_owner() AND organization_id = current_org_id())
  WITH CHECK (current_role_is_owner() AND organization_id = current_org_id());

CREATE POLICY products_brand_read ON products FOR SELECT
  USING (brand_id = current_brand_id() AND organization_id = current_org_id());

CREATE POLICY products_brand_write ON products FOR UPDATE
  USING (brand_id = current_brand_id() AND organization_id = current_org_id())
  WITH CHECK (brand_id = current_brand_id() AND organization_id = current_org_id());

CREATE POLICY products_brand_insert ON products FOR INSERT
  WITH CHECK (brand_id = current_brand_id() AND organization_id = current_org_id());

CREATE POLICY products_superadmin_all ON products FOR ALL
  USING (is_superadmin()) WITH CHECK (is_superadmin());

-- ---------- CUSTOMERS ----------
DROP POLICY IF EXISTS customers_owner_all ON customers;

CREATE POLICY customers_owner_all ON customers FOR ALL
  USING (current_role_is_owner() AND organization_id = current_org_id())
  WITH CHECK (current_role_is_owner() AND organization_id = current_org_id());

CREATE POLICY customers_superadmin_all ON customers FOR ALL
  USING (is_superadmin()) WITH CHECK (is_superadmin());

-- ---------- SALES ----------
DROP POLICY IF EXISTS sales_owner_all ON sales;

CREATE POLICY sales_owner_all ON sales FOR ALL
  USING (current_role_is_owner() AND organization_id = current_org_id())
  WITH CHECK (current_role_is_owner() AND organization_id = current_org_id());

CREATE POLICY sales_superadmin_all ON sales FOR ALL
  USING (is_superadmin()) WITH CHECK (is_superadmin());

-- ---------- SALE_ITEMS ----------
DROP POLICY IF EXISTS sale_items_owner_all ON sale_items;
DROP POLICY IF EXISTS sale_items_brand_read ON sale_items;

CREATE POLICY sale_items_owner_all ON sale_items FOR ALL
  USING (current_role_is_owner() AND organization_id = current_org_id())
  WITH CHECK (current_role_is_owner() AND organization_id = current_org_id());

CREATE POLICY sale_items_brand_read ON sale_items FOR SELECT
  USING (brand_id = current_brand_id() AND organization_id = current_org_id());

CREATE POLICY sale_items_superadmin_all ON sale_items FOR ALL
  USING (is_superadmin()) WITH CHECK (is_superadmin());

-- ---------- SETTLEMENTS ----------
DROP POLICY IF EXISTS settlements_owner_all ON settlements;
DROP POLICY IF EXISTS settlements_brand_read ON settlements;

CREATE POLICY settlements_owner_all ON settlements FOR ALL
  USING (current_role_is_owner() AND organization_id = current_org_id())
  WITH CHECK (current_role_is_owner() AND organization_id = current_org_id());

CREATE POLICY settlements_brand_read ON settlements FOR SELECT
  USING (brand_id = current_brand_id() AND organization_id = current_org_id());

CREATE POLICY settlements_superadmin_all ON settlements FOR ALL
  USING (is_superadmin()) WITH CHECK (is_superadmin());

-- ============================================================
-- 11. FUNCIÓN register_sale ACTUALIZADA (numera por org)
-- ============================================================

CREATE OR REPLACE FUNCTION register_sale(
  p_customer_id    uuid,
  p_payment_method payment_method,
  p_sold_by        uuid,
  p_items          jsonb,
  p_organization_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sale_id     uuid;
  v_item        jsonb;
  v_subtotal    numeric(12,2) := 0;
  v_discount    numeric(12,2) := 0;
  v_line_total  numeric(12,2);
  v_brand_id    uuid;
  v_stock       integer;
  v_org_id      uuid;
  v_next_num    integer;
BEGIN
  -- Obtener org del vendedor si no se provee
  SELECT COALESCE(p_organization_id, organization_id)
  INTO v_org_id
  FROM profiles WHERE id = p_sold_by;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró la organización del vendedor';
  END IF;

  -- Siguiente número de venta para esta org (con lock para evitar duplicados)
  PERFORM pg_advisory_xact_lock(hashtext(v_org_id::text));
  SELECT COALESCE(MAX(sale_number), 0) + 1
  INTO v_next_num
  FROM sales WHERE organization_id = v_org_id;

  -- Crear cabecera
  INSERT INTO sales (customer_id, payment_method, sold_by, subtotal, discount_total, total, organization_id, sale_number)
  VALUES (p_customer_id, p_payment_method, p_sold_by, 0, 0, 0, v_org_id, v_next_num)
  RETURNING id INTO v_sale_id;

  -- Procesar items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT stock_quantity, brand_id INTO v_stock, v_brand_id
    FROM products
    WHERE id = (v_item->>'product_id')::uuid
      AND organization_id = v_org_id
    FOR UPDATE;

    IF v_stock IS NULL THEN
      RAISE EXCEPTION 'Producto no encontrado: %', v_item->>'product_id';
    END IF;
    IF v_stock < (v_item->>'quantity')::int THEN
      RAISE EXCEPTION 'Stock insuficiente para el producto %', v_item->>'product_id';
    END IF;

    v_line_total := ((v_item->>'unit_price')::numeric * (v_item->>'quantity')::int)
                    - coalesce((v_item->>'discount')::numeric, 0);

    INSERT INTO sale_items (sale_id, product_id, brand_id, quantity, unit_price, discount, line_total, organization_id)
    VALUES (
      v_sale_id,
      (v_item->>'product_id')::uuid,
      v_brand_id,
      (v_item->>'quantity')::int,
      (v_item->>'unit_price')::numeric,
      coalesce((v_item->>'discount')::numeric, 0),
      v_line_total,
      v_org_id
    );

    UPDATE products
    SET stock_quantity = stock_quantity - (v_item->>'quantity')::int,
        updated_at = now()
    WHERE id = (v_item->>'product_id')::uuid AND organization_id = v_org_id;

    v_subtotal := v_subtotal + ((v_item->>'unit_price')::numeric * (v_item->>'quantity')::int);
    v_discount := v_discount + coalesce((v_item->>'discount')::numeric, 0);
  END LOOP;

  UPDATE sales
  SET subtotal = v_subtotal, discount_total = v_discount, total = v_subtotal - v_discount
  WHERE id = v_sale_id;

  RETURN v_sale_id;
END;
$$;

-- ============================================================
-- 12. FUNCIÓN cancel_sale ACTUALIZADA
-- ============================================================

CREATE OR REPLACE FUNCTION cancel_sale(p_sale_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_item   record;
  v_org_id uuid;
BEGIN
  SELECT organization_id INTO v_org_id
  FROM sales WHERE id = p_sale_id AND cancelled = false;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Venta no encontrada o ya fue anulada';
  END IF;

  FOR v_item IN SELECT product_id, quantity FROM sale_items WHERE sale_id = p_sale_id
  LOOP
    UPDATE products
    SET stock_quantity = stock_quantity + v_item.quantity, updated_at = now()
    WHERE id = v_item.product_id AND organization_id = v_org_id;
  END LOOP;

  UPDATE sales SET cancelled = true, cancelled_at = now() WHERE id = p_sale_id;
END;
$$;

COMMIT;

-- ============================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- Corre estas queries para confirmar que todo quedó bien:
-- ============================================================
-- SELECT COUNT(*) FROM organizations;           → debe ser 1
-- SELECT COUNT(*) FROM profiles;                → debe ser 2 (owner + superadmin)
-- SELECT COUNT(*) FROM brands WHERE organization_id IS NOT NULL;  → todas
-- SELECT id, role, organization_id FROM profiles;
