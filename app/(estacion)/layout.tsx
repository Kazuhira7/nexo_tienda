import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Fixed device screens (print station): owner or the device account ("terminal"),
// no staff PIN and no idle lock — nobody operates orders from here.
export default async function EstacionLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organizations(enabled_modules)")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "owner" && profile.role !== "terminal")) redirect("/");
  const modules = (profile.organizations as { enabled_modules: string[] } | null)?.enabled_modules ?? [];
  if (!modules.includes("restaurant")) redirect("/");

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6 max-w-6xl mx-auto space-y-4">
      <Link href="/salon" className="text-sm text-muted-foreground hover:text-foreground">← Volver al salón</Link>
      {children}
    </main>
  );
}
