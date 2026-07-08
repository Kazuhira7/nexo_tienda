#!/usr/bin/env node
/**
 * Seeds a fully-populated DEMO organization for sales demos.
 * Idempotent-ish: aborts if the demo org slug already exists.
 *
 * The demo credentials below are intentionally public — they exist to be
 * shared with prospects. Never reuse them for real accounts.
 *
 * Run: node scripts/seed-demo.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_SLUG = "colectivo-demo-nexo";
const DEMO_OWNER = { email: "demo.duena@nexo-demo.com", name: "Dueña Demo" };
const DEMO_BRAND_USER = { email: "demo.marca@nexo-demo.com", name: "Marca Demo" };
const DEMO_PASSWORD = "NexoDemo2026"; // public demo credential, by design

const die = (msg, err) => { console.error("✗", msg, err ?? ""); process.exit(1); };

// ── guard: don't double-seed ─────────────────────────────────────
{
  const { data } = await admin.from("organizations").select("id").eq("slug", DEMO_SLUG).maybeSingle();
  if (data) die(`La org demo ya existe (${DEMO_SLUG}). Bórrala primero si quieres re-sembrar.`);
}

// ── org ──────────────────────────────────────────────────────────
const { data: org, error: orgErr } = await admin
  .from("organizations")
  .insert({
    name: "Colectivo Demo Nexo",
    slug: DEMO_SLUG,
    vertical: "colectivo",
    currency: "NIO",
    settlement_model: "space_fee",
    settlement_period: "quincenal",
    exchange_rate: 36.63,
    enabled_modules: ["pos", "inventory", "customers", "cash", "brands", "settlements"],
  })
  .select("id")
  .single();
if (orgErr) die("creando org", orgErr);
const ORG = org.id;
console.log("✓ Org demo:", ORG);

// ── users ────────────────────────────────────────────────────────
async function mkUser({ email, name }, role, brand_id = null) {
  const { data, error } = await admin.auth.admin.createUser({
    email, password: DEMO_PASSWORD, email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (error) die(`creando usuario ${email}`, error);
  const { error: pErr } = await admin.from("profiles").upsert({
    id: data.user.id, role, brand_id, organization_id: ORG, full_name: name,
  });
  if (pErr) die(`perfil de ${email}`, pErr);
  return data.user.id;
}

const ownerId = await mkUser(DEMO_OWNER, "owner");
console.log("✓ Dueña demo:", DEMO_OWNER.email);

// ── brands ───────────────────────────────────────────────────────
const brandDefs = [
  { name: "Aroma Candle Co.",   contact_name: "Lucía Mendoza",  phone: "8888-1001", space_fee: 740 },
  { name: "Hilos & Puntadas",   contact_name: "Carmen Ruiz",    phone: "8888-1002", space_fee: 740 },
  { name: "Verde Vivo Plantas", contact_name: "Marcos Peralta", phone: "8888-1003", space_fee: 550 },
  { name: "Dulce Antojo",       contact_name: "Rosa Talavera",  phone: "8888-1004", space_fee: 550 },
];
const { data: brands, error: bErr } = await admin
  .from("brands")
  .insert(brandDefs.map((b) => ({ ...b, organization_id: ORG, commission_rate: 0, active: true })))
  .select("id, name");
if (bErr) die("creando marcas", bErr);
console.log("✓ Marcas:", brands.map((b) => b.name).join(", "));

const brandUserId = await mkUser(DEMO_BRAND_USER, "brand", brands[0].id);
console.log("✓ Usuario de marca demo:", DEMO_BRAND_USER.email, "→", brands[0].name);

// ── products ─────────────────────────────────────────────────────
const productDefs = [
  // Aroma Candle Co.
  { b: 0, code: "AC-001", name: "Vela de soya lavanda",      price: 320, cost: 150, stock: 14, low: 5 },
  { b: 0, code: "AC-002", name: "Vela cítrica grande",       price: 450, cost: 210, stock: 8,  low: 4 },
  { b: 0, code: "AC-003", name: "Difusor de bambú",          price: 520, cost: 260, stock: 3,  low: 4 },
  // Hilos & Puntadas
  { b: 1, code: "HP-001", name: "Bolso tejido mediano",      price: 680, cost: 320, stock: 6,  low: 3 },
  { b: 1, code: "HP-002", name: "Monedero bordado",          price: 220, cost: 90,  stock: 15, low: 5 },
  { b: 1, code: "HP-003", name: "Camino de mesa artesanal",  price: 850, cost: 400, stock: 4,  low: 2 },
  // Verde Vivo Plantas
  { b: 2, code: "VV-001", name: "Suculenta en maceta",       price: 180, cost: 70,  stock: 22, low: 8 },
  { b: 2, code: "VV-002", name: "Monstera pequeña",          price: 420, cost: 190, stock: 7,  low: 3 },
  { b: 2, code: "VV-003", name: "Maceta de barro pintada",   price: 260, cost: 110, stock: 12, low: 5 },
  // Dulce Antojo
  { b: 3, code: "DA-001", name: "Caja de brownies (6)",      price: 300, cost: 140, stock: 10, low: 4 },
  { b: 3, code: "DA-002", name: "Frasco de granola",         price: 240, cost: 100, stock: 2,  low: 4 },
  { b: 3, code: "DA-003", name: "Mermelada de jamaica",      price: 190, cost: 80,  stock: 9,  low: 3 },
];
const { data: products, error: prErr } = await admin
  .from("products")
  .insert(productDefs.map((p) => ({
    organization_id: ORG, brand_id: brands[p.b].id, code: p.code, name: p.name,
    price: p.price, cost: p.cost, stock_quantity: p.stock, low_stock_threshold: p.low, active: true,
  })))
  .select("id, code, price, brand_id");
if (prErr) die("creando productos", prErr);
console.log(`✓ ${products.length} productos`);

// ── customers ────────────────────────────────────────────────────
const { error: cErr } = await admin.from("customers").insert([
  { organization_id: ORG, name: "María Fernanda López", phone: "8877-2001", email: "mafe@example.com" },
  { organization_id: ORG, name: "Jorge Castillo",       phone: "8877-2002" },
  { organization_id: ORG, name: "Ana Cecilia Blandón",  phone: "8877-2003", notes: "Cliente frecuente" },
]);
if (cErr) die("creando clientes", cErr);
console.log("✓ 3 clientes");

// ── sales over the last 10 days ─────────────────────────────────
const byCode = Object.fromEntries(products.map((p) => [p.code, p]));
const methods = ["cash", "cash", "pos", "transfer", "cash", "pos"];
// [daysAgo, hour, [[code, qty, discount], ...]]
const saleDefs = [
  [9, 11, [["AC-001", 1, 0], ["VV-001", 2, 0]]],
  [8, 15, [["HP-002", 1, 20]]],
  [7, 10, [["DA-001", 2, 0]]],
  [6, 17, [["AC-002", 1, 0], ["DA-003", 1, 0]]],
  [5, 12, [["VV-002", 1, 0], ["VV-003", 2, 30]]],
  [4, 16, [["HP-001", 1, 0]]],
  [3, 11, [["AC-001", 2, 0], ["DA-002", 1, 0]]],
  [2, 14, [["VV-001", 3, 0], ["HP-002", 2, 0]]],
  [1, 13, [["DA-001", 1, 0], ["AC-003", 1, 50]]],
  [0, 10, [["VV-001", 1, 0], ["DA-003", 2, 0]]],
  [0, 12, [["HP-003", 1, 0]]],
];

let saleNumber = 1;
for (const [daysAgo, hour, lines] of saleDefs) {
  const at = new Date();
  at.setDate(at.getDate() - daysAgo);
  at.setHours(hour, Math.floor(Math.random() * 50), 0, 0);

  let subtotal = 0, discount = 0;
  const items = lines.map(([code, qty, disc]) => {
    const p = byCode[code];
    const lineTotal = p.price * qty - disc;
    subtotal += p.price * qty;
    discount += disc;
    return {
      organization_id: ORG, product_id: p.id, brand_id: p.brand_id,
      quantity: qty, unit_price: p.price, discount: disc, line_total: lineTotal,
    };
  });

  const { data: sale, error: sErr } = await admin
    .from("sales")
    .insert({
      organization_id: ORG, sale_number: saleNumber++, sold_by: ownerId,
      subtotal, discount_total: discount, total: subtotal - discount,
      payment_method: methods[saleNumber % methods.length],
      created_at: at.toISOString(), cancelled: false,
    })
    .select("id")
    .single();
  if (sErr) die("creando venta", sErr);

  const { error: siErr } = await admin
    .from("sale_items")
    .insert(items.map((i) => ({ ...i, sale_id: sale.id })));
  if (siErr) die("creando items de venta", siErr);
}
console.log(`✓ ${saleDefs.length} ventas de los últimos 10 días`);

// ── a brand payment + a cash closure from yesterday ─────────────
const { error: bpErr } = await admin.from("brand_payments").insert([
  { organization_id: ORG, brand_id: brands[0].id, type: "payout",      amount: 1500, method: "transfer",
    occurred_on: new Date(Date.now() - 3 * 864e5).toISOString().split("T")[0], notes: "Pago quincena anterior" },
  { organization_id: ORG, brand_id: brands[0].id, type: "fee_charge",  amount: 740,
    occurred_on: new Date(Date.now() - 3 * 864e5).toISOString().split("T")[0], notes: "Cuota de espacio" },
  { organization_id: ORG, brand_id: brands[0].id, type: "fee_payment", amount: 740, method: "cash",
    occurred_on: new Date(Date.now() - 2 * 864e5).toISOString().split("T")[0] },
]);
if (bpErr) die("creando movimientos de marca", bpErr);

const yesterday = new Date(Date.now() - 864e5).toISOString().split("T")[0];
const { error: ccErr } = await admin.from("cash_closures").insert({
  organization_id: ORG, closure_date: yesterday,
  expected_cash: 550, counted_cash: 550, expected_pos: 0, expected_transfer: 0,
  expected_mixed: 0, difference: 0, closed_by: ownerId, notes: "Cierre demo",
});
if (ccErr) die("creando cierre de caja", ccErr);
console.log("✓ Movimientos de marca y cierre de caja");

console.log(`
════════════════════════════════════════════
 DEMO LISTO — Colectivo Demo Nexo
 Dueña:  ${DEMO_OWNER.email}
 Marca:  ${DEMO_BRAND_USER.email} (${brands[0].name})
 Clave:  ${DEMO_PASSWORD}  (demo pública)
════════════════════════════════════════════`);
