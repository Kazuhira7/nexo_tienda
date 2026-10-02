import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { homeRoute } from "@/lib/home-route";
import type { VerticalType } from "@/types/database";

// Root route: redirect authenticated users to their role's (and org vertical's) home,
// unauthenticated users to login.
export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organizations(vertical)")
    .eq("id", user.id)
    .single();

  const vertical = (profile?.organizations as { vertical: VerticalType } | null)?.vertical;
  redirect(homeRoute(profile?.role, vertical));
}
