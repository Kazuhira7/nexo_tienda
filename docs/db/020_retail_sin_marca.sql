-- 020_retail_sin_marca.sql — tiendas, almacenes, bodegas y ferreterías venden productos propios:
-- la marca deja de ser obligatoria. El colectivo la sigue exigiendo desde la app (sus formularios
-- y liquidaciones dependen de ella); register_sale ya copia products.brand_id tal cual (null incluido).

alter table products   alter column brand_id drop not null;
alter table sale_items alter column brand_id drop not null;
