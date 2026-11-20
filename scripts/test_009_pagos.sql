-- ============================================================
-- Prueba de 008_orden_ui.sql + 009_pagos_divididos.sql.
-- Igual que test_006: simula usuarios y al final lanza una excepción
-- con el reporte, así que TODO se revierte. "FAIL …" = bug.
-- ============================================================
do $$
declare
  r text := ''; h text; org1 uuid := gen_random_uuid(); owner1 uuid := gen_random_uuid(); term1 uuid := gen_random_uuid();
  m_w uuid; m_c uuid; t1 uuid; item uuid; o1 uuid; o2 uuid; o3 uuid; oi uuid; oi2 uuid;
  tok_w text; tok_c text; bal numeric; n int; nm text;
begin
  insert into organizations (id, name, slug, vertical, enabled_modules)
    values (org1, 'T', 'test-009-' || left(org1::text, 8), 'restaurante', '{restaurant}');
  insert into auth.users (id, email, aud, role) values
    (owner1, 'o@t.invalid', 'authenticated', 'authenticated'), (term1, 't@t.invalid', 'authenticated', 'authenticated');
  insert into profiles (id, role, organization_id, full_name) values (owner1, 'owner', org1, 'O'), (term1, 'terminal', org1, 'T')
    on conflict (id) do update set role = excluded.role, organization_id = excluded.organization_id;

  perform set_config('request.jwt.claims', json_build_object('sub', owner1, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into staff_members (organization_id, name, permissions) values (org1, 'W', '{orders.take,orders.send}') returning id into m_w;
  insert into staff_members (organization_id, name, permissions)
    values (org1, 'C', '{orders.take,orders.send,payments.collect,orders.discount}') returning id into m_c;
  perform set_staff_pin(m_w, '1111');
  perform set_staff_pin(m_c, '2222');
  insert into dining_tables (organization_id, name) values (org1, 'Mesa 1') returning id into t1;
  insert into menu_items (organization_id, name, price) values (org1, 'Plato', 300) returning id into item;

  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', term1, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  tok_w := staff_login('1111')->>'token';
  tok_c := staff_login('2222')->>'token';

  -- 008: para llevar con nombre, editar pendientes, personas
  o3 := open_order(tok_w, null, 'takeaway', 1, '  Doña Ana  ');
  select customer_name into nm from orders where id = o3 and table_id is null;
  r := r || case when nm = 'Doña Ana' then E'\nok para llevar con nombre' else E'\nFAIL nombre' end;

  o1 := open_order(tok_w, t1);
  oi  := add_order_item(tok_w, o1, item, 1, '{}', null);
  perform update_order_item(tok_w, oi, 3, ' sin chile ');
  select count(*) into n from order_items where id = oi and quantity = 3 and notes = 'sin chile' and line_total = 900;
  r := r || case when n = 1 then E'\nok cantidad y notas (3 × 300)' else E'\nFAIL update_order_item' end;
  oi2 := add_order_item(tok_w, o1, item, 1, '{}', null);   -- total 1200
  perform send_order_to_kitchen(tok_w, o1);
  begin perform update_order_item(tok_w, oi, 2); r := r || E'\nFAIL editó enviado';
  exception when others then r := r || E'\nok enviado no editable'; end;
  perform set_order_guests(tok_w, o1, 4);
  select guests into n from orders where id = o1;
  r := r || case when n = 4 then E'\nok personas = 4' else E'\nFAIL guests' end;

  -- 009: permisos
  begin perform set_order_discount(tok_w, o1, 100); r := r || E'\nFAIL mesero dio descuento';
  exception when others then get stacked diagnostics h = pg_exception_hint; r := r || E'\nok mesero sin descuento (' || h || ')'; end;
  begin perform pay_order(tok_w, o1, 100, 'cash'); r := r || E'\nFAIL mesero cobró';
  exception when others then r := r || E'\nok mesero no cobra'; end;

  -- 009: cuenta dividida en 3 pagos
  perform set_order_discount(tok_c, o1, 150);              -- total 1050
  begin perform pay_order(tok_c, o1, 2000, 'cash'); r := r || E'\nFAIL pagó de más';
  exception when others then r := r || E'\nok monto > saldo rechazado'; end;
  begin perform pay_order(tok_c, o1, 100, 'mixed'); r := r || E'\nFAIL mixto';
  exception when others then r := r || E'\nok mixto rechazado'; end;

  bal := pay_order(tok_c, o1, 350, 'cash');
  r := r || case when bal = 700 then E'\nok pago 1 → saldo 700' else E'\nFAIL saldo1 ' || bal end;
  begin perform set_order_discount(tok_c, o1, 10); r := r || E'\nFAIL descuento después de pagar';
  exception when others then r := r || E'\nok descuento tras pago rechazado'; end;
  begin perform cancel_order(tok_c, o1, 'x'); r := r || E'\nFAIL canceló con pagos';
  exception when others then r := r || E'\nok no cancela con pagos'; end;
  bal := pay_order(tok_c, o1, 350, 'pos');
  select count(*) into n from dining_tables where id = t1 and status = 'occupied';
  r := r || case when bal = 350 and n = 1 then E'\nok pago 2 → saldo 350, mesa ocupada' else E'\nFAIL pago 2' end;
  bal := pay_order(tok_c, o1, 350, 'transfer');
  select count(*) into n from orders o join dining_tables t on t.id = o.table_id
    where o.id = o1 and o.status = 'paid' and t.status = 'free' and o.closed_by_staff = m_c;
  r := r || case when bal = 0 and n = 1 then E'\nok pago 3 → orden pagada, mesa libre' else E'\nFAIL cierre' end;

  -- 009: anular no puede dejar el total por debajo de lo cobrado
  o2 := open_order(tok_w, t1);
  oi := add_order_item(tok_w, o2, item, 1, '{}', null);
  oi2 := add_order_item(tok_w, o2, item, 1, '{}', null);
  perform pay_order(tok_c, o2, 400, 'cash');
  begin perform set_order_item_status(tok_w, oi2, 'cancelled'); r := r || E'\nFAIL anuló bajo lo cobrado';
  exception when others then r := r || E'\nok anulación bloqueada'; end;

  execute 'reset role';
  select count(*) into n from sales where order_id = o1 and source = 'restaurant';
  r := r || case when n = 3 then E'\nok 3 filas en sales' else E'\nFAIL filas ' || n end;
  select count(*) into n from sales where order_id = o1 and payment_method = 'cash'
    and subtotal = 500 and discount_total = 150 and total = 350;
  r := r || case when n = 1 then E'\nok primer pago lleva el descuento' else E'\nFAIL descuento en venta' end;
  select sum(total)::int into n from sales where order_id = o1;
  r := r || case when n = 1050 then E'\nok suma de pagos = total (1050)' else E'\nFAIL suma ' || n end;

  raise exception E'REPORTE 008/009 (todo revertido):%', r;
end $$;
