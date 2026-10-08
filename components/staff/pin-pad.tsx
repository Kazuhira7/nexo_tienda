"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LockIcon } from "lucide-react";
import { loginWithPin } from "@/lib/staff-actions";
import PinKeypad from "@/components/staff/pin-keypad";
import BrandBackdrop from "@/components/auth/brand-backdrop";

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
    <div className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center px-5 py-10">
      <BrandBackdrop />

      <div className="relative z-10 w-full max-w-sm space-y-6">
        <div className="text-center text-white nx-fade">
          <div className="flex items-baseline justify-center gap-2">
            <span className="font-heading text-4xl font-bold tracking-tight">nexo</span>
          </div>
          <p className="mt-1 text-white/75 truncate">{orgName}</p>
        </div>

        <div className="rounded-3xl bg-card text-card-foreground p-6 shadow-[0_24px_60px_-20px_rgba(11,30,102,0.6)]
                        animate-in fade-in slide-in-from-bottom-6 zoom-in-95 duration-500 delay-150 fill-mode-both space-y-5">
          <div className="flex items-center justify-center gap-2 text-sm font-medium">
            <LockIcon className="size-4 text-primary" />
            Ingresa tu PIN
          </div>
          <PinKeypad onComplete={submit} pending={pending} error={error} onInput={() => setError(null)} />
        </div>

        <div className="text-center space-y-3">
          {canLeave && (
            <Link href="/dashboard" className="block text-sm text-white/80 underline-offset-4 hover:text-white hover:underline">
              Ir al panel de administración
            </Link>
          )}
          <p className="text-xs text-white/50">nexo · Desarrollado por AG Systems</p>
        </div>
      </div>
    </div>
  );
}
