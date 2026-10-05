-- ============================================================
-- Prueba de 006_restaurante.sql — se corre DESPUÉS de la migración,
-- en el SQL Editor (o vía MCP). Crea dos orgs de prueba, simula
-- dueña / cuenta del local / anon con set role + jwt claims, y al
-- final lanza una excepción con el reporte: TODO se revierte.
-- Cada línea "ok …" es un caso que se comportó como se esperaba;
-- cualquier "FAIL …" es un bug.
-- ============================================================
do $$
declare
  r      text := '';
  h      text;
  org1   uuid := gen_random_uuid();
  org2   uuid := gen_random_uuid();
  owner1 uuid := gen_random_uuid();
  term1  uuid := gen_random_uuid();
  term2  uuid := gen_random_uuid();
  m_w    uuid; m_c uuid; m_m uuid;
  area   uuid; t1 uuid; t2 uuid; cat uuid; item uuid; grp uuid; grp2 uuid;
  mod1   uuid; mod2 uuid; mod_x uuid;
  cust2  uuid := gen_random_uuid();
  tok_w  text; tok_c text; tok_m text;
  res    jsonb;
  o1     uuid; o2 uuid; oi1 uuid; sale uuid;
  n      int;
  i      int;
begin
  -- ---------- Setup (postgres) ----------
  insert into organizations (id, name, slug, vertical, enabled_modules) values
    (org1, 'Test Resto 1', 'test-r1-' || left(org1::text, 8), 'restaurante', '{restaurant,kitchen,customers,cash}'),
    (org2, 'Test Resto 2', 'test-r2-' || left(org2::text, 8), 'restaurante', '{restaurant,kitchen,customers,cash}');
  insert into auth.users (id, email, aud, role) values
    (owner1, 'owner1@test.invalid', 'authenticated', 'authenticated'),
    (term1,  'term1@test.invalid',  'authenticated', 'authenticated'),
    (term2,  'term2@test.invalid',  'authenticated', 'authenticated');
  insert into profiles (id, role, organization_id, full_name) values
    (owner1, 'owner', org1, 'Dueña 1'),
    (term1, 'terminal', org1, 'Local 1'),
    (term2, 'terminal', org2, 'Local 2')
  on conflict (id) do update set role = excluded.role, organization_id = excluded.organization_id;
  insert into customers (id, organization_id, name) values (cust2, org2, 'Cliente de otra org');

  -- ---------- Dueña: equipo, PINs, menú (vía RLS) ----------
  perform set_config('request.jwt.claims', json_build_object('sub', owner1, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  insert into staff_members (organization_id, name, position, permissions)
    values (org1, 'Mesero', 'Mesero', '{orders.take,orders.send}') returning id into m_w;
  insert into staff_members (organization_id, name, position, permissions)
    values (org1, 'Cajera', 'Cajero', '{orders.take,orders.send,payments.collect,orders.discount}') returning id into m_c;
  insert into staff_members (organization_id, name, position, permissions)
    values (org1, 'Gerente', 'Gerente / Admin',
            '{orders.take,orders.send,orders.void_item,orders.cancel,orders.discount,payments.collect,kitchen.update,menu.availability}')
    returning id into m_m;
  r := r || E'\nok owner crea equipo (RLS)';

  begin
    insert into staff_members (organization_id, name, permissions) values (org1, 'X', '{hack.all}');
    r := r || E'\nFAIL permiso inventado aceptado';
  exception when others then r := r || E'\nok permiso inventado rechazado'; end;

  begin
    insert into staff_members (organization_id, name) values (org2, 'Intruso');
    r := r || E'\nFAIL owner insertó en otra org';
  exception when others then r := r || E'\nok owner no puede insertar en otra org'; end;

  perform set_staff_pin(m_w, '1111');
  perform set_staff_pin(m_c, '2222');
  perform set_staff_pin(m_m, '3333');
  begin
    perform set_staff_pin(m_m, '1111');
    r := r || E'\nFAIL PIN duplicado aceptado';
  exception when others then r := r || E'\nok PIN duplicado: ' || sqlerrm; end;
  begin
    perform set_staff_pin(m_m, '12a4');
    r := r || E'\nFAIL PIN no numérico aceptado';
  exception when others then r := r || E'\nok PIN inválido: ' || sqlerrm; end;

  select count(*) into n from staff_pins;
  r := r || case when n = 0 then E'\nok owner no ve hashes de PIN' else E'\nFAIL owner ve staff_pins' end;
  select count(*) into n from staff_members_with_pin();
  r := r || case when n = 3 then E'\nok staff_members_with_pin = 3' else E'\nFAIL staff_members_with_pin = ' || n end;

  insert into dining_areas (organization_id, name) values (org1, 'Salón') returning id into area;
  insert into dining_tables (organization_id, area_id, name) values (org1, area, 'Mesa 1') returning id into t1;
  insert into dining_tables (organization_id, area_id, name) values (org1, area, 'Mesa 2') returning id into t2;
  insert into menu_categories (organization_id, name) values (org1, 'Platos fuertes') returning id into cat;
  insert into menu_items (organization_id, category_id, name, price) values (org1, cat, 'Churrasco', 300) returning id into item;
  insert into modifier_groups (organization_id, name, min_select, max_select) values (org1, 'Término', 1, 1) returning id into grp;
  insert into modifier_groups (organization_id, name, min_select, max_select) values (org1, 'Suelto', 0, 1) returning id into grp2;
  insert into modifiers (organization_id, group_id, name, price_delta) values (org1, grp, 'Tres cuartos', 0) returning id into mod1;
  insert into modifiers (organization_id, group_id, name, price_delta) values (org1, grp, 'Bien cocido', 10) returning id into mod2;
  insert into modifiers (organization_id, group_id, name, price_delta) values (org1, grp2, 'No ligado', 5) returning id into mod_x;
  insert into menu_item_modifier_groups (menu_item_id, group_id, organization_id) values (item, grp, org1);
  r := r || E'\nok owner arma menú y mesas (RLS)';

  -- ---------- Cuenta del local (terminal) ----------
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', term1, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  begin
    insert into menu_items (organization_id, name, price) values (org1, 'Hack', 1);
    r := r || E'\nFAIL terminal escribió en menu_items';
  exception when others then r := r || E'\nok terminal no escribe menú'; end;

  select count(*) into n from menu_items;
  r := r || case when n = 1 then E'\nok terminal lee menú' else E'\nFAIL terminal lee menú: ' || n end;

  begin
    perform open_order(null, t1);
    r := r || E'\nFAIL open_order sin PIN';
  exception when others then r := r || E'\nok sin PIN: ' || sqlerrm; end;

  res := staff_login('9999');
  r := r || case when not (res->>'ok')::boolean then E'\nok PIN incorrecto: ' || (res->>'error') else E'\nFAIL PIN 9999 entró' end;

  res := staff_login('1111');
  tok_w := res->>'token';
  r := r || case when (res->>'ok')::boolean and res->>'name' = 'Mesero' then E'\nok login mesero' else E'\nFAIL login mesero ' || res::text end;

  res := current_staff(tok_w);
  r := r || case when res->>'name' = 'Mesero' then E'\nok current_staff' else E'\nFAIL current_staff' end;
  r := r || case when current_staff('x') is null then E'\nok current_staff token basura = null' else E'\nFAIL current_staff basura' end;

  o1 := open_order(tok_w, t1, 'dine_in', 2);
  select order_number into n from orders where id = o1;
  r := r || case when n = 1 then E'\nok open_order #1' else E'\nFAIL order_number ' || n end;
  select count(*) into n from dining_tables where id = t1 and status = 'occupied';
  r := r || case when n = 1 then E'\nok mesa ocupada' else E'\nFAIL mesa no ocupada' end;

  begin
    perform open_order(tok_w, t1);
    r := r || E'\nFAIL dos órdenes abiertas en la misma mesa';
  exception when others then r := r || E'\nok mesa con orden: ' || sqlerrm; end;

  begin
    perform add_order_item(tok_w, o1, item, 1, '{}');
    r := r || E'\nFAIL faltó término y se aceptó';
  exception when others then r := r || E'\nok mínimo de grupo: ' || sqlerrm; end;
  begin
    perform add_order_item(tok_w, o1, item, 1, array[mod1, mod2]);
    r := r || E'\nFAIL dos términos aceptados';
  exception when others then r := r || E'\nok máximo de grupo: ' || sqlerrm; end;
  begin
    perform add_order_item(tok_w, o1, item, 1, array[mod1, mod_x]);
    r := r || E'\nFAIL modificador ajeno aceptado';
  exception when others then r := r || E'\nok modificador ajeno: ' || sqlerrm; end;

  oi1 := add_order_item(tok_w, o1, item, 2, array[mod2], '  sin sal ');
  select count(*) into n from order_items where id = oi1 and line_total = 620 and notes = 'sin sal';
  r := r || case when n = 1 then E'\nok add_order_item precio de BD (2 x (300+10) = 620)' else E'\nFAIL line_total/notes' end;

  n := send_order_to_kitchen(tok_w, o1);
  r := r || case when n = 1 then E'\nok enviado a cocina' else E'\nFAIL send ' || n end;

  begin
    perform set_order_item_status(tok_w, oi1, 'cancelled');
    r := r || E'\nFAIL mesero anuló platillo enviado';
  exception when others then
    get stacked diagnostics h = pg_exception_hint;
    r := r || E'\nok mesero no anula enviado (hint ' || coalesce(h, '-') || ')';
  end;
  begin
    perform set_order_item_status(tok_w, oi1, 'ready');
    r := r || E'\nFAIL mesero marcó listo';
  exception when others then r := r || E'\nok mesero no marca cocina'; end;

  begin
    perform pay_order(tok_w, o1, 100, 'cash');
    r := r || E'\nFAIL mesero cobró';
  exception when others then
    get stacked diagnostics h = pg_exception_hint;
    r := r || E'\nok mesero no cobra (hint ' || coalesce(h, '-') || ')';
  end;

  perform request_bill(tok_w, o1);
  select count(*) into n from dining_tables where id = t1 and status = 'bill_requested';
  r := r || case when n = 1 then E'\nok cuenta pedida' else E'\nFAIL request_bill' end;

  tok_c := staff_login('2222')->>'token';
  begin
    perform pay_order(tok_c, o1, 620, 'cash', cust2);
    r := r || E'\nFAIL cliente de otra org aceptado';
  exception when others then r := r || E'\nok cliente ajeno: ' || sqlerrm; end;
  begin
    perform set_order_discount(tok_c, o1, 700);
    r := r || E'\nFAIL descuento mayor al subtotal';
  exception when others then r := r || E'\nok descuento inválido: ' || sqlerrm; end;

  perform set_order_discount(tok_c, o1, 20);
  perform pay_order(tok_c, o1, 600, 'cash');
  r := r || E'\nok cobro completo (pay_order)';

  select count(*) into n from sales;
  r := r || case when n = 0 then E'\nok terminal no lee ventas' else E'\nFAIL terminal lee ' || n || ' ventas' end;
  select count(*) into n from cash_closures;
  r := r || case when n = 0 then E'\nok terminal no lee caja' else E'\nFAIL terminal lee caja' end;
  select count(*) into n from dining_tables where id = t1 and status = 'free';
  r := r || case when n = 1 then E'\nok mesa liberada' else E'\nFAIL mesa no liberada' end;

  begin
    perform add_order_item(tok_w, o1, item, 1, array[mod1]);
    r := r || E'\nFAIL agregó a orden cerrada';
  exception when others then r := r || E'\nok orden cerrada: ' || sqlerrm; end;

  -- Supervisor one-shot: cancelar orden
  o2 := open_order(tok_w, t2);
  begin
    perform cancel_order(tok_c, o2, 'Cliente se fue');
    r := r || E'\nFAIL cajera canceló orden';
  exception when others then r := r || E'\nok cajera no cancela'; end;
  tok_m := staff_login('3333', true)->>'token';
  perform cancel_order(tok_m, o2, 'Cliente se fue');
  select count(*) into n from orders where id = o2 and status = 'cancelled' and cancelled_by_staff = m_m;
  r := r || case when n = 1 then E'\nok gerente canceló con PIN de un uso' else E'\nFAIL cancel_order' end;
  begin
    perform open_order(tok_m, t2);
    r := r || E'\nFAIL token de un uso reutilizado';
  exception when others then r := r || E'\nok token de un uso consumido'; end;

  begin
    perform require_staff(tok_w, null);
    r := r || E'\nFAIL require_staff ejecutable por clientes';
  exception when others then r := r || E'\nok require_staff no expuesto'; end;

  -- ---------- Otra org con el token de esta ----------
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', term2, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform open_order(tok_c, null, 'takeaway');
    r := r || E'\nFAIL token usado desde otra org';
  exception when others then r := r || E'\nok token de otra org rechazado'; end;
  select count(*) into n from orders;
  r := r || case when n = 0 then E'\nok otra org no ve órdenes' else E'\nFAIL otra org ve ' || n || ' órdenes' end;
  select count(*) into n from staff_members;
  r := r || case when n = 0 then E'\nok otra org no ve equipo' else E'\nFAIL otra org ve equipo' end;

  -- ---------- anon ----------
  execute 'reset role';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
  begin
    perform staff_login('1111');
    r := r || E'\nFAIL anon ejecutó staff_login';
  exception when others then r := r || E'\nok anon sin acceso a RPC'; end;

  -- ---------- Verificación como postgres ----------
  execute 'reset role';
  select id, sale_number into sale, n from sales where order_id = o1 and organization_id = org1
    and source = 'restaurant' and subtotal = 620 and discount_total = 20 and total = 600
    and sold_by = term1;
  r := r || case when n = 1 then E'\nok venta #1 en sales (620 - 20 = 600)' else E'\nFAIL fila de sales' end;
  select count(*) into n from orders where id = o1 and status = 'paid' and sale_id = sale and closed_by_staff = m_c;
  r := r || case when n = 1 then E'\nok orden pagada y ligada a la venta' else E'\nFAIL orden pagada' end;

  -- ---------- Fuerza bruta ----------
  perform set_config('request.jwt.claims', json_build_object('sub', term1, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  for i in 1..10 loop perform staff_login('0000'); end loop;
  res := staff_login('1111');
  r := r || case when not (res->>'ok')::boolean then E'\nok bloqueo tras 10 fallos: ' || (res->>'error') else E'\nFAIL sin bloqueo' end;
  execute 'reset role';

  raise exception E'REPORTE 006 (todo revertido):%', r;
end $$;
