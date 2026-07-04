"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerBusiness } from "./actions";
import { VERTICAL_INFO } from "@/lib/modules";
import type { VerticalType } from "@/types/database";

export default function RegistroPage() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [vertical, setVertical] = useState<VerticalType>("colectivo");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const fd = new FormData();
    fd.set("business_name", businessName);
    fd.set("vertical", vertical);
    fd.set("owner_name", ownerName);
    fd.set("email", email);
    fd.set("password", password);

    start(async () => {
      const result = await registerBusiness(fd);
      if (result?.error) {
        setError(result.error);
        return;
      }
      // Account created server-side — sign in and go to the dashboard
      const supabase = createClient();
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) {
        setError("Cuenta creada, pero el inicio de sesión falló. Entra desde el login.");
        return;
      }
      window.location.href = "/dashboard";
    });
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="lg:hidden text-center">
        <p className="text-3xl font-heading font-bold text-primary">nexo</p>
      </div>

      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold">Crea tu negocio</h1>
        <p className="text-muted-foreground text-sm">
          En un minuto tienes tu sistema funcionando. Sin tarjeta.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Tipo de negocio */}
        <div className="space-y-1.5">
          <Label>¿Qué tipo de negocio tienes?</Label>
          <div className="grid grid-cols-1 gap-2">
            {(Object.entries(VERTICAL_INFO) as [VerticalType, { label: string; description: string }][]).map(([key, info]) => (
              <button
                key={key}
                type="button"
                onClick={() => setVertical(key)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  vertical === key ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
              >
                <p className="font-semibold text-sm">{info.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{info.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="business_name">Nombre del negocio</Label>
          <Input
            id="business_name"
            placeholder="Ej. Tienda Bella Vista"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
            className="h-11"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="owner_name">Tu nombre</Label>
          <Input
            id="owner_name"
            placeholder="Nombre completo"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            required
            autoComplete="name"
            className="h-11"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            type="email"
            placeholder="tu@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="h-11"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            type="password"
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="h-11"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-11 text-base font-semibold"
          variant="cta"
          disabled={pending}
        >
          {pending ? "Creando tu negocio…" : "Crear mi negocio"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
