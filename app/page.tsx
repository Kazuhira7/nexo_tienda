import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { homeRoute } from "@/lib/home-route";

// Root route: redirect authenticated users to their role's home,
// unauthenticated users to login.
export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  redirect(homeRoute(profile?.role));
}
