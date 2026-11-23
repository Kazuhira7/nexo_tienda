-- 021_indices_y_rls.sql — rendimiento (advisors de Supabase, nov 2026)
-- Índices para las llaves foráneas que se usan en joins, filtros o borrados en cascada.
create index if not exists sale_items_product_id_idx            on sale_items (product_id);
create index if not exists sales_customer_id_idx                on sales (customer_id);
create index if not exists orders_customer_id_idx               on orders (customer_id);
create index if not exists orders_sale_id_idx                   on orders (sale_id);
create index if not exists order_items_menu_item_id_idx         on order_items (menu_item_id);
create index if not exists menu_items_category_id_idx           on menu_items (category_id);
create index if not exists dining_tables_area_id_idx            on dining_tables (area_id);
create index if not exists menu_item_modifier_groups_group_idx  on menu_item_modifier_groups (group_id);
create index if not exists profiles_brand_id_idx                on profiles (brand_id);
create index if not exists staff_members_profile_id_idx         on staff_members (profile_id);
create index if not exists brand_payments_settlement_id_idx     on brand_payments (settlement_id);

-- auth.uid() evaluado una vez por consulta, no por fila
drop policy if exists profiles_self_read on profiles;
create policy profiles_self_read on profiles for select using (
  id = (select auth.uid())
  or (current_role_is_owner() and organization_id = current_org_id())
  or is_superadmin()
);
