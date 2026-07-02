// Page-level guard: 404 when the org doesn't have the module enabled.
// Defense in depth on top of RLS — routes of disabled modules disappear.
import { notFound } from "next/navigation";
import { getOrgContext } from "@/lib/org-context";
import type { ModuleId } from "@/types/database";

export async function requireModule(id: ModuleId): Promise<void> {
  const { modules } = await getOrgContext();
  if (!modules.includes(id)) notFound();
}
