// Server-only helpers for the staff PIN session (see docs/db/006_restaurante.sql).
// The session token lives in an httpOnly cookie; the browser never sees it.
// Every staff RPC receives it as p_staff_token and validates it in Postgres.
// Server-only: import from Server Components / Server Actions, never from "use client".
import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { neededPermission, type PermissionId } from "@/lib/permissions";
import type { CurrentStaff } from "@/types/database";

export const STAFF_COOKIE = "nexo_staff";
export const STAFF_SESSION_MAX_AGE = 14 * 60 * 60; // matches staff_login (14 h)

export async function getStaffToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(STAFF_COOKIE)?.value ?? null;
}

/** Staff member of the current PIN session, or null. Memoized per request. */
export const getCurrentStaff = cache(async (): Promise<CurrentStaff | null> => {
  const token = await getStaffToken();
  if (!token) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("current_staff", { p_token: token });
  return (data as CurrentStaff | null) ?? null;
});

/**
 * Supervisor override ("PIN de autorización"): validates someone else's PIN and
 * returns a single-use token valid for 60 s. Use it inside a Server Action and pass
 * it straight to the RPC that needed the permission — never return it to the client.
 */
export async function authorizeWithPin(pin: string): Promise<{ token: string } | { error: string }> {
  if (!/^\d{4}$/.test(pin)) return { error: "El PIN debe tener 4 dígitos" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("staff_login", { p_pin: pin, p_one_shot: true });
  if (error) return { error: error.message };
  const result = data as { ok: boolean; token?: string; error?: string };
  return result.ok && result.token ? { token: result.token } : { error: result.error ?? "PIN incorrecto" };
}

/** Shape returned by staff Server Actions. */
export type StaffActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; pinRequired?: boolean; needsPermission?: PermissionId };

/** Maps a Postgres error raised by require_staff() to a StaffActionResult. */
export function staffError(error: { message: string; hint?: string | null }): StaffActionResult<never> {
  return {
    ok:              false,
    error:           error.message,
    pinRequired:     error.hint === "pin_required",
    needsPermission: neededPermission(error.hint) ?? undefined,
  };
}
