"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DeleteIcon, LockIcon } from "lucide-react";
import { loginWithPin } from "@/lib/staff-actions";

const PIN_LENGTH = 4;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const;

interface Props {
  orgName:   string;
  canLeave?: boolean; // owner on her own device can go to the admin panel instead
}

// Full-screen PIN lock for shared devices. Auto-submits on the 4th digit.
export default function PinPad({ orgName, canLeave }: Props) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = useCallback((value: string) => {
    startTransition(async () => {
      const result = await loginWithPin(value);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
        setPin("");
      }
    });
  }, [router]);

  const press = useCallback((key: string) => {
    if (pending) return;
    setError(null);
    if (key === "del") {
      setPin(pin.slice(0, -1));
      return;
    }
    if (pin.length >= PIN_LENGTH) return;
    const next = pin + key;
    setPin(next);
    if (next.length === PIN_LENGTH) submit(next);
  }, [pin, pending, submit]);

  // Physical keyboard (tablet with keyboard / desktop cashier)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") press("del");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-xs space-y-8">
        <div className="text-center space-y-2">
          <p className="text-3xl font-heading font-bold text-primary">nexo</p>
          <p className="text-sm text-muted-foreground truncate">{orgName}</p>
        </div>

        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-sm font-medium">
            <LockIcon className="size-4 text-muted-foreground" />
            Ingresa tu PIN
          </div>
          <div className="flex justify-center gap-4" aria-label={`${pin.length} de ${PIN_LENGTH} dígitos`}>
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <span
                key={i}
                className={`size-4 rounded-full border-2 transition-colors ${
                  error
                    ? "border-destructive"
                    : i < pin.length
                      ? "bg-primary border-primary"
                      : "border-muted-foreground/40"
                }`}
              />
            ))}
          </div>
          <p className="h-5 text-sm text-destructive" role="alert">
            {pending ? <span className="text-muted-foreground">Verificando…</span> : error}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {KEYS.map((key, i) =>
            key === "" ? (
              <span key={i} />
            ) : (
              <button
                key={i}
                type="button"
                onClick={() => press(key)}
                disabled={pending}
                aria-label={key === "del" ? "Borrar" : key}
                className="h-16 rounded-2xl bg-muted/60 text-2xl font-semibold active:bg-primary/15 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center select-none"
              >
                {key === "del" ? <DeleteIcon className="size-6" /> : key}
              </button>
            )
          )}
        </div>

        {canLeave && (
          <div className="text-center">
            <Link href="/dashboard" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
              Ir al panel de administración
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
