"use client";

import { useCallback, useEffect, useState } from "react";
import { DeleteIcon } from "lucide-react";

const PIN_LENGTH = 4;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const;

interface Props {
  onComplete: (pin: string) => void; // called on the 4th digit
  pending?:   boolean;
  error?:     string | null;
  onInput?:   () => void;              // clears the parent's error when typing again
}

// 4-dot PIN entry with big keys; also accepts the physical keyboard.
export default function PinKeypad({ onComplete, pending, error, onInput }: Props) {
  const [pin, setPin] = useState("");
  const [attempt, setAttempt] = useState(0); // re-keys the dots so a failed attempt shakes again

  const press = useCallback((key: string) => {
    if (pending) return;
    onInput?.();
    if (key === "del") {
      setPin(pin.slice(0, -1));
      return;
    }
    if (pin.length >= PIN_LENGTH) return;
    const next = pin + key;
    if (next.length === PIN_LENGTH) {
      setPin("");
      setAttempt((a) => a + 1);
      onComplete(next);
    } else {
      setPin(next);
    }
  }, [pin, pending, onComplete, onInput]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") press("del");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  const filled = pending ? PIN_LENGTH : pin.length;

  return (
    <div className="space-y-5">
      <div className="space-y-3 text-center">
        <div
          key={error && !pending ? `err-${attempt}` : "ok"}
          className={`flex justify-center gap-4 ${error && !pending ? "animate-shake" : ""}`}
          aria-label={`${filled} de ${PIN_LENGTH} dígitos`}
        >
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <span
              key={`${i}-${i < filled}`}
              className={`size-4 rounded-full border-2 transition-colors duration-200 ${i < filled ? "animate-pop" : ""} ${
                error && !pending
                  ? "border-destructive"
                  : i < filled
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
              className="h-16 rounded-2xl bg-muted/60 text-2xl font-semibold hover:bg-muted active:bg-primary/20 active:scale-90 transition-all duration-150 disabled:opacity-50 flex items-center justify-center select-none"
            >
              {key === "del" ? <DeleteIcon className="size-6" /> : key}
            </button>
          )
        )}
      </div>
    </div>
  );
}
