"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { EyeIcon, EyeOffIcon } from "lucide-react";

export default function PasswordForm() {
  const [newPass, setNewPass]     = useState("");
  const [confirmPass, setConfirm] = useState("");
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPass.length < 8) { toast.error("La contraseña debe tener al menos 8 caracteres"); return; }
    if (newPass !== confirmPass) { toast.error("Las contraseñas no coinciden"); return; }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPass });
    setLoading(false);

    if (error) { toast.error(error.message); return; }
    toast.success("Contraseña actualizada correctamente");
    setNewPass(""); setConfirm("");
  }

  const strong = newPass.length >= 8;

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-5 space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="new_pass">Nueva contraseña</Label>
        <div className="relative">
          <Input
            id="new_pass"
            type={showPass ? "text" : "password"}
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            required
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPass ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
          </button>
        </div>
        {/* Indicador de fortaleza */}
        {newPass.length > 0 && (
          <div className="flex gap-1 mt-1.5">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i < Math.min(Math.floor(newPass.length / 2), 4)
                    ? newPass.length >= 12 ? "bg-green-500" : newPass.length >= 8 ? "bg-amber-500" : "bg-red-500"
                    : "bg-muted"
                }`}
              />
            ))}
            <span className="text-xs text-muted-foreground ml-2">
              {newPass.length < 8 ? "Muy corta" : newPass.length < 12 ? "Aceptable" : "Fuerte"}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirm_pass">Confirmar contraseña</Label>
        <Input
          id="confirm_pass"
          type="password"
          value={confirmPass}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repite la contraseña"
          required
        />
        {confirmPass && confirmPass !== newPass && (
          <p className="text-xs text-destructive">Las contraseñas no coinciden</p>
        )}
      </div>

      <Button
        type="submit"
        variant="default"
        disabled={loading || !strong || newPass !== confirmPass}
        className="w-full"
      >
        {loading ? "Actualizando…" : "Cambiar contraseña"}
      </Button>
    </form>
  );
}
