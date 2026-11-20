"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  STAFF_COOKIE,
  STAFF_SESSION_MAX_AGE,
  getStaffToken,
  type StaffActionResult,
} from "@/lib/staff-session";
import type { StaffLoginResult } from "@/types/database";

// Opens a staff session on this device: validates the PIN in Postgres
// (rate-limited per org) and stores the session token in an httpOnly cookie.
export async function loginWithPin(pin: string): Promise<StaffActionResult<{ name: string }>> {
  if (!/^\d{4}$/.test(pin)) return { ok: false, error: "El PIN debe tener 4 dígitos" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("staff_login", { p_pin: pin });
  if (error) return { ok: false, error: error.message };

  const result = data as StaffLoginResult;
  if (!result.ok) return { ok: false, error: result.error };

  const cookieStore = await cookies();
  cookieStore.set(STAFF_COOKIE, result.token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "strict",
    path:     "/",
    maxAge:   STAFF_SESSION_MAX_AGE,
  });

  return { ok: true, data: { name: result.name } };
}

// Locks the device: ends the staff session (server + cookie).
// The device's auth session (cuenta del local) stays open.
export async function switchUser(): Promise<void> {
  const token = await getStaffToken();
  if (token) {
    const supabase = await createClient();
    await supabase.rpc("staff_logout", { p_token: token });
  }
  const cookieStore = await cookies();
  cookieStore.delete(STAFF_COOKIE);
}
