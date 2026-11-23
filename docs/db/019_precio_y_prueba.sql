-- 019_precio_y_prueba.sql — oferta comercial (nov 2026): 14 días de prueba, C$1,500/mes en todos
-- los tipos de negocio y WhatsApp de ventas para la pantalla de "tu prueba terminó".

update platform_settings set
  trial_days      = 14,
  fee_restaurante = 1500,
  fee_retail      = 1500,
  fee_colectivo   = 1500,
  sales_whatsapp  = '50589374127',
  updated_at      = now()
where id = 1;
