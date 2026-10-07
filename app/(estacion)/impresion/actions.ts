"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// Print station (fixed screen, no staff PIN): the RPCs only check that the
// signed-in account belongs to the org's team (owner / terminal).
const uuid = z.string().uuid();

export async function markPrinted(ticketId: string) {
  if (!uuid.safeParse(ticketId).success) return { error: "Ticket inválido" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_kitchen_ticket_printed", { p_ticket_id: ticketId });
  return error ? { error: error.message } : { success: true as const };
}

export async function reprint(ticketId: string) {
  if (!uuid.safeParse(ticketId).success) return { error: "Ticket inválido" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("reprint_kitchen_ticket", { p_ticket_id: ticketId });
  return error ? { error: error.message } : { success: true as const };
}
