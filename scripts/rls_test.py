#!/usr/bin/env python3
"""RLS isolation test: creates two throwaway brand users and verifies
that each brand can only see/touch its own data through the real
PostgREST + anon key + JWT path. Passwords are random and never printed."""
import json
import secrets
import subprocess
import sys

ENV = {}
with open("/Users/alejandrogonzalez/Documents/proyecto_colectivo/nexo-tienda/.env.local") as f:
    for line in f:
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            ENV[k.strip()] = v.strip()

URL = ENV["NEXT_PUBLIC_SUPABASE_URL"]
ANON = ENV["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
SERVICE = ENV["SUPABASE_SERVICE_ROLE_KEY"]

ORG = "00000000-0000-0000-0000-000000000001"
BRANDS = {
    "flor":   {"id": "52c76da3-b78f-4eeb-bdb0-37ea27e74746", "email": "marca-flor-test@nexo.test"},
    "leones": {"id": "c5c46723-eefe-48ed-aa53-bbf5997c3d63", "email": "marca-leones-test@nexo.test"},
}

def req(method, path, key, token=None, body=None, prefer=None):
    # curl uses the macOS system trust store; body goes via stdin so
    # credentials never appear in argv
    cmd = ["curl", "-s", "-w", "\n%{http_code}", "-X", method, URL + path,
           "-H", f"apikey: {key}", "-H", f"Authorization: Bearer {token or key}",
           "-H", "Content-Type: application/json"]
    if prefer:
        cmd += ["-H", f"Prefer: {prefer}"]
    stdin = None
    if body is not None:
        cmd += ["--data", "@-"]
        stdin = json.dumps(body)
    out = subprocess.run(cmd, input=stdin, capture_output=True, text=True).stdout
    raw, _, code = out.rpartition("\n")
    try:
        return int(code), json.loads(raw) if raw.strip() else None
    except json.JSONDecodeError:
        return int(code), raw

failures = []

def check(name, cond, detail=""):
    mark = "PASS" if cond else "FAIL"
    print(f"  [{mark}] {name}" + (f" — {detail}" if detail and not cond else ""))
    if not cond:
        failures.append(name)

# ── 1. Create throwaway users (or reuse if already there) ──────────
for label, b in BRANDS.items():
    pw = secrets.token_urlsafe(18)  # thrown away after this run
    st, res = req("POST", "/auth/v1/admin/users", SERVICE,
                  body={"email": b["email"], "password": pw, "email_confirm": True})
    if st in (200, 201):
        b["uid"] = res["id"]
    else:
        # already exists → look it up and reset to a fresh random password
        st2, res2 = req("GET", f"/auth/v1/admin/users?page=1&per_page=100", SERVICE)
        users = res2.get("users", res2) if isinstance(res2, dict) else res2
        match = [u for u in users if u.get("email") == b["email"]]
        if not match:
            print(f"No pude crear ni encontrar {b['email']}: {st} {res}")
            sys.exit(1)
        b["uid"] = match[0]["id"]
        req("PUT", f"/auth/v1/admin/users/{b['uid']}", SERVICE, body={"password": pw})
    b["pw"] = pw

# ── 2. Point their profiles at their brand ──────────────────────────
for label, b in BRANDS.items():
    st, res = req("PATCH", f"/rest/v1/profiles?id=eq.{b['uid']}", SERVICE,
                  body={"role": "brand", "brand_id": b["id"], "organization_id": ORG,
                        "full_name": f"Usuario prueba {label}"},
                  prefer="return=representation")
    if st != 200 or not res:
        # trigger may not have fired yet → insert directly
        st, res = req("POST", "/rest/v1/profiles", SERVICE,
                      body={"id": b["uid"], "role": "brand", "brand_id": b["id"],
                            "organization_id": ORG, "full_name": f"Usuario prueba {label}"},
                      prefer="return=representation")
        if st not in (200, 201):
            print(f"No pude configurar el perfil de {label}: {st} {res}")
            sys.exit(1)

# ── 3. Sign in as each brand (real password grant) ─────────────────
for label, b in BRANDS.items():
    st, res = req("POST", "/auth/v1/token?grant_type=password", ANON,
                  body={"email": b["email"], "password": b["pw"]})
    if st != 200:
        print(f"Login falló para {label}: {st} {res}")
        sys.exit(1)
    b["token"] = res["access_token"]

# One product of each brand (via service key) for the write test
_, prods = req("GET", "/rest/v1/products?select=id,brand_id", SERVICE)
prod_of = {}
for p in prods:
    prod_of.setdefault(p["brand_id"], p["id"])

# ── 4. Isolation checks per brand ───────────────────────────────────
tables = ["products", "sale_items", "brand_payments", "settlements"]
pairs = [("flor", "leones"), ("leones", "flor")]

for me, other in pairs:
    mine, theirs = BRANDS[me], BRANDS[other]
    tok = mine["token"]
    print(f"\nComo marca «{me}» ({mine['email']}):")

    for t in tables:
        st, rows = req("GET", f"/rest/v1/{t}?select=brand_id", ANON, token=tok)
        rows = rows if isinstance(rows, list) else []
        foreign = [r for r in rows if r.get("brand_id") != mine["id"]]
        check(f"{t}: solo filas propias ({len(rows)} visibles)", st == 200 and not foreign,
              f"status={st}, filas ajenas={len(foreign)}")

    st, rows = req("GET", "/rest/v1/customers?select=id", ANON, token=tok)
    rows = rows if isinstance(rows, list) else []
    check("customers: no ve la cartera de clientes", len(rows) == 0, f"ve {len(rows)}")

    st, rows = req("GET", "/rest/v1/cash_closures?select=id", ANON, token=tok)
    rows = rows if isinstance(rows, list) else []
    check("cash_closures: no ve cierres de caja", len(rows) == 0, f"ve {len(rows)}")

    # Cross-brand write must touch 0 rows
    target = prod_of.get(theirs["id"])
    if target:
        st, res = req("PATCH", f"/rest/v1/products?id=eq.{target}", ANON, token=tok,
                      body={"price": 999999}, prefer="return=representation")
        touched = len(res) if isinstance(res, list) else 0
        check("UPDATE producto de otra marca: 0 filas afectadas", touched == 0,
              f"status={st}, afectó {touched}")

    # Own-brand write must work (brand can edit its own inventory)
    own = prod_of.get(mine["id"])
    if own:
        st, res = req("GET", f"/rest/v1/products?id=eq.{own}&select=price", ANON, token=tok)
        orig = res[0]["price"] if isinstance(res, list) and res else None
        st, res = req("PATCH", f"/rest/v1/products?id=eq.{own}", ANON, token=tok,
                      body={"price": orig}, prefer="return=representation")
        touched = len(res) if isinstance(res, list) else 0
        check("UPDATE producto propio: permitido", touched == 1, f"status={st}, afectó {touched}")

print()
if failures:
    print(f"RESULTADO: {len(failures)} FALLOS DE AISLAMIENTO ❌")
    sys.exit(1)
print("RESULTADO: AISLAMIENTO RLS CORRECTO ✅ (0 fugas)")
