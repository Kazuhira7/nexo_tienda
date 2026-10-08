"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRightIcon, EyeIcon, EyeOffIcon, Loader2Icon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0); // re-keys the error so it shakes on every failure
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
      setError("Correo o contraseña incorrectos. Revisa los datos e intenta de nuevo.");
      setAttempt((a) => a + 1);
      setLoading(false);
      return;
    }

    // Full page reload so the server proxy reads the new session cookie;
    // "/" resolves the home route from the user's role.
    window.location.href = "/";
  }

  return (
    <div className="space-y-8 max-w-sm mx-auto">
      <div className="space-y-1.5">
        <h2 className="font-heading text-3xl font-bold tracking-tight">Inicia sesión</h2>
        <p className="text-muted-foreground">Entra a tu negocio en nexo.</p>
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
            className="h-12 rounded-xl px-4 text-base"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="password">Contraseña</Label>
            <Link href="/recuperar" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              ¿La olvidaste?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="h-12 rounded-xl px-4 pr-12 text-base"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 size-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
            </button>
          </div>
        </div>

        {error && (
          <div key={attempt} role="alert"
            className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 animate-shake">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          variant="cta"
          className="group w-full h-12 rounded-xl text-base font-semibold gap-2 shadow-[0_10px_24px_-10px_rgba(255,92,26,0.7)]"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2Icon className="size-5 animate-spin" /> Entrando…
            </>
          ) : (
            <>
              Entrar
              <ArrowRightIcon className="size-5 transition-transform duration-200 group-hover:translate-x-1" />
            </>
          )}
        </Button>
      </form>

      <div className="rounded-2xl border border-dashed px-5 py-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">¿Tienes un negocio?</p>
          <p className="text-xs text-muted-foreground">Empieza gratis, sin tarjeta.</p>
        </div>
        <Link href="/registro"
          className="shrink-0 text-sm font-semibold text-primary hover:underline underline-offset-4">
          Crear cuenta
        </Link>
      </div>
    </div>
  );
}
