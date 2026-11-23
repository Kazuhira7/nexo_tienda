-- 023_brand_sales.sql — el portal de marca no veía ninguna venta: las marcas leen sus sale_items
-- pero no la tabla sales (fecha, número, forma de pago, anulada), así que todo se descartaba,
-- y "Mi cuenta" sumaba ventas anuladas. Abrir sales a las marcas mostraría totales con productos
-- de otras marcas; en su lugar, esta función devuelve solo las líneas de la propia marca.

create or replace function brand_sales(p_from timestamptz default null, p_to timestamptz default null)
returns table (
  sale_item_id   uuid,
  sale_number    int,
  created_at     timestamptz,
  payment_method payment_method,
  product_code   text,
  product_name   text,
  quantity       int,
  unit_price     numeric,
  discount       numeric,
  line_total     numeric
)
language sql stable security definer set search_path = public as $$
  select si.id, s.sale_number, s.created_at, s.payment_method,
         p.code, p.name, si.quantity, si.unit_price, si.discount, si.line_total
  from sale_items si
  join sales s on s.id = si.sale_id
  left join products p on p.id = si.product_id
  where current_brand_id() is not null
    and si.brand_id = current_brand_id()
    and si.organization_id = current_org_id()
    and not s.cancelled
    and (p_from is null or s.created_at >= p_from)
    and (p_to   is null or s.created_at <  p_to)
  order by s.created_at desc;
$$;

revoke execute on function brand_sales(timestamptz, timestamptz) from public, anon;
grant  execute on function brand_sales(timestamptz, timestamptz) to authenticated;
