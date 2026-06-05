import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminNav from "@/components/admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "superadmin") redirect("/dashboard");

  return (
    <div className="min-h-screen flex flex-col">
      <AdminNav userName={profile.full_name ?? user.email ?? "Super Admin"} />
      <main className="flex-1 container max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
