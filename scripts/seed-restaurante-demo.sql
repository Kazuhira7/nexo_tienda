-- ============================================================
-- seed-restaurante-demo.sql — negocio demo del vertical restaurante.
-- Crea "Restaurante Demo Nexo" con menú de ejemplo, extras, áreas,
-- mesas y equipo (SIN PIN: se asignan desde /equipo).
-- No crea cuentas de auth: dueña y cuenta del local se crean en /admin.
-- Idempotente por slug: si ya existe, no hace nada.
-- Para borrarlo:  delete from organizations where slug = 'restaurante-demo';
-- ============================================================
do $$
declare
  v_org   uuid;
  c_fuer  uuid; c_picar uuid; c_comp uuid; c_post uuid; c_beb uuid;
  g_term  uuid; g_extra uuid;
  a_salon uuid; a_kiosc uuid;
  i       uuid;
begin
  if exists (select 1 from organizations where slug = 'restaurante-demo') then
    raise notice 'Restaurante demo ya existe';
    return;
  end if;

  insert into organizations (name, slug, currency, settlement_model, vertical, enabled_modules)
  values ('Restaurante Demo Nexo', 'restaurante-demo', 'NIO', 'none', 'restaurante', '{restaurant,customers,cash}')
  returning id into v_org;

  -- Categorías
  insert into menu_categories (organization_id, name, sort_order) values (v_org, 'Platos fuertes', 1) returning id into c_fuer;
  insert into menu_categories (organization_id, name, sort_order) values (v_org, 'Para picar', 2) returning id into c_picar;
  insert into menu_categories (organization_id, name, sort_order) values (v_org, 'Para compartir', 3) returning id into c_comp;
  insert into menu_categories (organization_id, name, sort_order) values (v_org, 'Postres', 4) returning id into c_post;
  insert into menu_categories (organization_id, name, sort_order) values (v_org, 'Bebidas', 5) returning id into c_beb;

  -- Extras y opciones
  insert into modifier_groups (organization_id, name, min_select, max_select)
    values (v_org, 'Término de la carne', 1, 1) returning id into g_term;
  insert into modifiers (organization_id, group_id, name, price_delta, sort_order) values
    (v_org, g_term, 'Término medio', 0, 1),
    (v_org, g_term, 'Tres cuartos', 0, 2),
    (v_org, g_term, 'Bien cocido', 0, 3);

  insert into modifier_groups (organization_id, name, min_select, max_select)
    values (v_org, 'Extras', 0, 3) returning id into g_extra;
  insert into modifiers (organization_id, group_id, name, price_delta, sort_order) values
    (v_org, g_extra, 'Extra queso', 30, 1),
    (v_org, g_extra, 'Extra gallo pinto', 40, 2),
    (v_org, g_extra, 'Extra tajadas', 35, 3),
    (v_org, g_extra, 'Huevo frito', 20, 4);

  -- Platillos (precios en córdobas)
  insert into menu_items (organization_id, category_id, name, description, price, cost, sort_order)
    values (v_org, c_fuer, 'Churrasco', 'Con gallo pinto, tajadas y chimichurri', 380, 190, 1) returning id into i;
  insert into menu_item_modifier_groups (menu_item_id, group_id, organization_id, sort_order)
    values (i, g_term, v_org, 0), (i, g_extra, v_org, 1);
  insert into menu_items (organization_id, category_id, name, description, price, cost, sort_order)
    values (v_org, c_fuer, 'Carne asada', 'Con gallo pinto, queso frito y ensalada', 300, 150, 2) returning id into i;
  insert into menu_item_modifier_groups (menu_item_id, group_id, organization_id, sort_order)
    values (i, g_term, v_org, 0), (i, g_extra, v_org, 1);
  insert into menu_items (organization_id, category_id, name, description, price, cost, sort_order)
    values (v_org, c_fuer, 'Pollo a la plancha', 'Con arroz, ensalada y tajadas', 260, 120, 3) returning id into i;
  insert into menu_item_modifier_groups (menu_item_id, group_id, organization_id) values (i, g_extra, v_org);
  insert into menu_items (organization_id, category_id, name, description, price, cost, sort_order)
    values (v_org, c_fuer, 'Filete de pescado', 'Al ajillo, con arroz y ensalada', 320, 160, 4);

  insert into menu_items (organization_id, category_id, name, price, cost, sort_order) values
    (v_org, c_picar, 'Tostones con queso', 150, 60, 1),
    (v_org, c_picar, 'Alitas BBQ', 220, 100, 3);
  insert into menu_items (organization_id, category_id, name, price, cost, sort_order)
    values (v_org, c_picar, 'Nachos', 180, 80, 2) returning id into i;
  insert into menu_item_modifier_groups (menu_item_id, group_id, organization_id) values (i, g_extra, v_org);

  insert into menu_items (organization_id, category_id, name, description, price, cost, sort_order) values
    (v_org, c_comp, 'Picada nica', 'Carne, pollo, chorizo, queso frito y tostones', 550, 260, 1),
    (v_org, c_comp, 'Parrillada familiar', 'Para 4 personas', 950, 480, 2);

  insert into menu_items (organization_id, category_id, name, price, cost, sort_order) values
    (v_org, c_post, 'Tres leches', 90, 35, 1),
    (v_org, c_post, 'Pío V', 90, 35, 2),
    (v_org, c_post, 'Flan de caramelo', 80, 30, 3);

  insert into menu_items (organization_id, category_id, name, price, cost, prep_station, sort_order) values
    (v_org, c_beb, 'Fresco natural', 50, 15, 'bar', 1),
    (v_org, c_beb, 'Gaseosa', 40, 20, 'bar', 2),
    (v_org, c_beb, 'Café', 35, 10, 'bar', 3);
  -- Un agotado, para ver el toggle
  update menu_items set available = false where organization_id = v_org and name = 'Pío V';

  -- Áreas y mesas: 10 mesas + 4 kioscos = 14 espacios
  insert into dining_areas (organization_id, name, sort_order) values (v_org, 'Salón', 1) returning id into a_salon;
  insert into dining_areas (organization_id, name, sort_order) values (v_org, 'Kioscos', 2) returning id into a_kiosc;
  insert into dining_tables (organization_id, area_id, name, seats, sort_order)
    select v_org, a_salon, 'Mesa ' || n, 4, n from generate_series(1, 10) n;
  insert into dining_tables (organization_id, area_id, name, seats, sort_order)
    select v_org, a_kiosc, 'Kiosko ' || n, 6, n from generate_series(1, 4) n;

  -- Equipo (sin PIN — se asigna en /equipo)
  insert into staff_members (organization_id, name, position, permissions) values
    (v_org, 'Carlos', 'Mesero', '{orders.take,orders.send}'),
    (v_org, 'María',  'Cajero', '{orders.take,orders.send,payments.collect,orders.discount}');

  raise notice 'Restaurante demo creado: %', v_org;
end $$;
