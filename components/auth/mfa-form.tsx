"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2Icon, ShieldCheckIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BRAND } from "@/lib/brand";

type Step =
  | { kind: "loading" }
  | { kind: "enroll"; factorId: string; qr: string; secret: string }
  | { kind: "verify"; factorId: string }
  | { kind: "error"; message: string };

// Superadmin second factor (TOTP: Google Authenticator, Authy…). The database only treats the
// superadmin as such with an aal2 session (018), so the admin panel stays behind this screen.
export default function MfaForm() {
  const [step, setStep] = useState<Step>({ kind: "loading" });
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel === "aal2") { window.location.href = "/admin"; return; }

      const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) { setStep({ kind: "error", message: listError.message }); return; }

      const verified = factors.totp.find((f) => f.status === "verified");
      if (verified) { setStep({ kind: "verify", factorId: verified.id }); return; }

      // Leftovers from an enrollment that was never confirmed block a new one
      for (const f of factors.all.filter((f) => f.status === "unverified")) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp", friendlyName: `${BRAND.name} admin`, issuer: BRAND.name,
      });
      if (enrollError || !data) { setStep({ kind: "error", message: enrollError?.message ?? "No se pudo iniciar" }); return; }
      setStep({ kind: "enroll", factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    })();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step.kind !== "enroll" && step.kind !== "verify") return;
    setError(null);
    start(async () => {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: step.factorId, code: code.trim(),
      });
      if (verifyError) {
        setError("Código incorrecto o vencido. Usa el que aparece ahora en tu app.");
        setCode("");
        return;
      }
      window.location.href = "/admin";
    });
  }

  if (step.kind === "loading") {
    return <div className="flex justify-center py-10"><Loader2Icon className="size-6 animate-spin text-muted-foreground" /></div>;
  }
  if (step.kind === "error") {
    return <p className="text-sm text-destructive">{step.message}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {step.kind === "enroll" ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Escanea este código con una app de autenticación (Google Authenticator, Authy o la de tu
            preferencia). Solo se hace una vez.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element -- data: URI SVG from Supabase */}
          <img src={step.qr} alt="Código QR para la app de autenticación" className="mx-auto size-48 rounded-xl bg-white p-2" />
          <p className="text-xs text-muted-foreground text-center break-all">
            ¿No puedes escanear? Escribe esta clave: <span className="font-mono text-foreground">{step.secret}</span>
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground flex gap-2">
          <ShieldCheckIcon className="size-5 shrink-0 text-primary" />
          Escribe el código de 6 dígitos que muestra tu app de autenticación.
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="mfa-code">Código</Label>
        <Input id="mfa-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required
          value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="h-12 text-center text-2xl tracking-[0.4em] font-mono" placeholder="000000" />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <Button type="submit" disabled={pending || code.length !== 6} className="w-full h-11">
        {pending && <Loader2Icon className="size-4 animate-spin" />}
        {step.kind === "enroll" ? "Activar verificación" : "Entrar al panel"}
      </Button>
    </form>
  );
}
