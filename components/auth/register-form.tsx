"use client";

import { useState, useTransition } from "react";
import { EyeIcon, EyeOffIcon, Loader2Icon, StoreIcon, ShoppingBagIcon, UtensilsCrossedIcon, CheckIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerBusiness } from "@/app/(auth)/registro/actions";
import { VERTICAL_INFO } from "@/lib/modules";
import type { VerticalType } from "@/types/database";

const VERTICAL_ICON: Record<VerticalType, typeof StoreIcon> = {
  restaurante: UtensilsCrossedIcon,
  retail:      ShoppingBagIcon,
  colectivo:   StoreIcon,
};
const VERTICAL_ORDER: VerticalType[] = ["restaurante", "retail", "colectivo"];

// Public self-service signup: creates the business + owner, then signs in.
export default function RegisterForm() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [vertical, setVertical] = useState<VerticalType>("restaurante");
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
        setAttempt((a) => a + 1);
        return;
      }
      // Account created server-side — sign in and go home
      const supabase = createClient();
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) {
        setError("Tu negocio se creó, pero no pudimos iniciar sesión. Entra desde \"Iniciar sesión\".");
        return;
      }
      window.location.href = "/";
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-muted-foreground">En un minuto tienes tu sistema funcionando. Sin tarjeta.</p>

      <div className="space-y-2">
        <Label>¿Qué tipo de negocio tienes?</Label>
        <div className="grid grid-cols-3 gap-2">
          {VERTICAL_ORDER.map((key) => {
            const Icon = VERTICAL_ICON[key];
            const on = vertical === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setVertical(key)}
                aria-pressed={on}
                className={`relative rounded-xl border-2 px-2 py-3 flex flex-col items-center gap-1.5 text-center transition-all duration-150 active:scale-95 ${
                  on ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/40"
                }`}
              >
                {on && <CheckIcon className="absolute top-1.5 right-1.5 size-3.5 animate-in zoom-in duration-200" />}
                <Icon className="size-5" />
                <span className="text-xs font-semibold leading-tight">{VERTICAL_INFO[key].label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">{VERTICAL_INFO[vertical].description}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="business_name">Nombre del negocio</Label>
        <Input id="business_name" placeholder="Ej. Restaurante La Esquina" value={businessName}
          onChange={(e) => setBusinessName(e.target.value)} required className="h-12 rounded-xl px-4 text-base" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="owner_name">Tu nombre</Label>
        <Input id="owner_name" placeholder="Nombre completo" value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)} required autoComplete="name" className="h-12 rounded-xl px-4 text-base" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg_email">Correo electrónico</Label>
        <Input id="reg_email" type="email" placeholder="tu@correo.com" value={email}
          onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className="h-12 rounded-xl px-4 text-base" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg_password">Contraseña</Label>
        <div className="relative">
          <Input id="reg_password" type={showPassword ? "text" : "password"} placeholder="Mínimo 8 caracteres"
            value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
            autoComplete="new-password" className="h-12 rounded-xl px-4 pr-12 text-base" />
          <button type="button" onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 size-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
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

      <Button type="submit" variant="cta" disabled={pending}
        className="w-full h-12 rounded-xl text-base font-semibold gap-2 shadow-[0_10px_24px_-10px_rgba(255,92,26,0.7)]">
        {pending ? <><Loader2Icon className="size-5 animate-spin" /> Creando tu negocio…</> : "Crear mi negocio"}
      </Button>
    </form>
  );
}
