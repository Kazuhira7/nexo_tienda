"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MailCheckIcon } from "lucide-react";

export default function RecuperarPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/restablecer`,
    });
    setLoading(false);

    if (resetError) {
      setError("No se pudo enviar el correo. Intenta de nuevo en unos minutos.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="w-full max-w-sm space-y-6 text-center">
        <MailCheckIcon className="size-12 text-primary mx-auto" />
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Revisa tu correo</h1>
          <p className="text-sm text-muted-foreground">
            Si existe una cuenta con <strong>{email}</strong>, te enviamos un
            enlace para restablecer tu contraseña. Revisa también la carpeta de spam.
          </p>
        </div>
        <Link href="/login" className="inline-block text-primary text-sm font-medium hover:underline">
          ← Volver al inicio de sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Recuperar contraseña</h1>
        <p className="text-muted-foreground text-sm">
          Escribe tu correo y te enviaremos un enlace para crear una contraseña nueva.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
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

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <Button type="submit" className="w-full h-11 font-semibold" variant="cta" disabled={loading}>
          {loading ? "Enviando…" : "Enviar enlace"}
        </Button>
      </form>

      <p className="text-center text-sm">
        <Link href="/login" className="text-muted-foreground hover:text-primary hover:underline">
          ← Volver al inicio de sesión
        </Link>
      </p>
    </div>
  );
}
