"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PinKeypad from "@/components/staff/pin-keypad";
import { PERMISSIONS, type PermissionId } from "@/lib/permissions";
import type { StaffActionResult } from "@/lib/staff-session";

type Runner<T> = (authPin?: string) => Promise<StaffActionResult<T>>;

interface RunOptions<T> {
  /** Runs inside the transition before the action (e.g. an optimistic update). */
  before?:    () => void;
  onSuccess?: (data: T) => void;
  /** Called when the first attempt fails (a supervisor retry may still succeed later). */
  onError?:   () => void;
}

interface AuthRequest {
  permission: PermissionId;
  retry:      (pin: string) => Promise<string | null>; // error message or null on success
}

/**
 * Runs staff Server Actions and handles the shared outcomes:
 * - pinRequired     → the PIN session expired: refresh to show the lock screen
 * - needsPermission → ask for a supervisor PIN and retry the same action with it
 * Render `authDialog` once in the component tree.
 */
export function useStaffAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [request, setRequest] = useState<AuthRequest | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authPending, startAuth] = useTransition();

  const run = useCallback(<T,>(fn: Runner<T>, opts: RunOptions<T> = {}) => {
    startTransition(async () => {
      opts.before?.();
      const result = await fn();
      if (result.ok) {
        opts.onSuccess?.(result.data);
        return;
      }
      opts.onError?.();
      if (result.pinRequired) {
        toast.error(result.error);
        router.refresh();
      } else if (result.needsPermission) {
        setAuthError(null);
        setRequest({
          permission: result.needsPermission,
          retry: async (pin) => {
            const retried = await fn(pin);
            if (retried.ok) {
              opts.onSuccess?.(retried.data);
              return null;
            }
            return retried.error;
          },
        });
      } else {
        toast.error(result.error);
      }
    });
  }, [router]);

  const submitPin = useCallback((pin: string) => {
    if (!request) return;
    startAuth(async () => {
      const error = await request.retry(pin);
      if (error) {
        setAuthError(error);
      } else {
        setRequest(null);
        router.refresh();
      }
    });
  }, [request, router]);

  const authDialog = (
    <Dialog open={!!request} onOpenChange={(open) => !open && setRequest(null)}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheckIcon className="size-5 text-primary" />
            Autorización
          </DialogTitle>
        </DialogHeader>
        {request && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Se necesita el PIN de alguien con permiso para{" "}
              <span className="font-medium text-foreground">{PERMISSIONS[request.permission].label.toLowerCase()}</span>.
            </p>
            <PinKeypad onComplete={submitPin} pending={authPending} error={authError}
              onInput={() => setAuthError(null)} />
            <Button variant="outline" className="w-full" onClick={() => setRequest(null)}>
              Cancelar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  return { run, pending, authDialog };
}
