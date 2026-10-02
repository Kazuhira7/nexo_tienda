"use client";

import { useCallback, useEffect, useRef, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { UserRoundIcon, LockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { switchUser } from "@/lib/staff-actions";

// Shared devices lock themselves after this much inactivity.
// The server also expires idle PIN sessions (30 min) as a backstop.
const IDLE_LOCK_MS = 5 * 60 * 1000;
// Fixed screens that must stay open during service.
const NO_IDLE_LOCK_PATHS = ["/cocina"];

interface Props {
  name:     string;
  position: string;
}

// Who is operating this device right now + "Cambiar usuario" + idle auto-lock.
export default function StaffBar({ name, position }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lock = useCallback(() => {
    startTransition(async () => {
      await switchUser();
      router.refresh();
    });
  }, [router]);

  useEffect(() => {
    if (NO_IDLE_LOCK_PATHS.some((p) => pathname.startsWith(p))) return;

    const reset = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(lock, IDLE_LOCK_MS);
    };
    const events = ["pointerdown", "keydown", "touchstart", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (timer.current) clearTimeout(timer.current);
    };
  }, [pathname, lock]);

  return (
    <div className="sticky top-14 lg:top-0 z-40 border-b bg-card/95 backdrop-blur px-4 sm:px-6 h-12 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <UserRoundIcon className="size-4 text-primary shrink-0" />
        <p className="text-sm font-semibold truncate">{name}</p>
        <span className="text-xs text-muted-foreground truncate hidden sm:inline">· {position}</span>
      </div>
      <Button variant="outline" size="lg" onClick={lock} disabled={pending} className="gap-1.5 shrink-0">
        <LockIcon className="size-4" />
        {pending ? "Bloqueando…" : "Cambiar usuario"}
      </Button>
    </div>
  );
}
