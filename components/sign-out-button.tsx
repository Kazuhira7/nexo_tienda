"use client";

import { useState } from "react";
import { LogOutIcon, Loader2Icon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { switchUser } from "@/lib/staff-actions";

// Standalone sign-out (screens without the app shell: subscription wall, MFA).
export default function SignOutButton({ className }: { className?: string }) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    await switchUser().catch(() => {}); // close any staff PIN session on this device too
    await createClient().auth.signOut();
    window.location.href = "/login";
  }

  return (
    <button type="button" onClick={handleClick} disabled={pending}
      className={className ?? "inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"}>
      {pending ? <Loader2Icon className="size-4 animate-spin" /> : <LogOutIcon className="size-4" />}
      Cerrar sesión
    </button>
  );
}
