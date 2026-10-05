"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LockIcon } from "lucide-react";
import { loginWithPin } from "@/lib/staff-actions";
import PinKeypad from "@/components/staff/pin-keypad";

interface Props {
  orgName:   string;
  canLeave?: boolean; // owner on her own device can go to the admin panel instead
}

// Full-screen PIN lock for shared devices. Auto-submits on the 4th digit.
export default function PinPad({ orgName, canLeave }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = useCallback((pin: string) => {
    startTransition(async () => {
      const result = await loginWithPin(pin);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-xs space-y-8">
        <div className="text-center space-y-2">
          <p className="text-3xl font-heading font-bold text-primary">nexo</p>
          <p className="text-sm text-muted-foreground truncate">{orgName}</p>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm font-medium">
          <LockIcon className="size-4 text-muted-foreground" />
          Ingresa tu PIN
        </div>

        <PinKeypad onComplete={submit} pending={pending} error={error} onInput={() => setError(null)} />

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
