"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Correo o contraseña incorrectos.");
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      // Full page reload so the server proxy reads the new session cookie
      window.location.href = profile?.role === "owner" ? "/dashboard" : "/mi-tienda";
    }
  }

  return (
    <div className="w-full max-w-sm space-y-8">
      {/* Logo — solo visible en móvil (el panel izquierdo lo tiene en desktop) */}
      <div className="lg:hidden text-center">
        <p className="text-3xl font-heading font-bold text-primary">nexo</p>
        <p className="text-muted-foreground text-sm mt-1">Sistema de tienda colectiva</p>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Bienvenida</h1>
        <p className="text-muted-foreground text-sm">
          Ingresa tus datos para continuar
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-5">
        <div className="space-y-2">
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

        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
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
          disabled={loading}
        >
          {loading ? "Ingresando…" : "Entrar"}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        ¿Problemas para entrar? Contacta a tu administradora.
      </p>
    </div>
  );
}
