import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BrandNav from "@/components/brand-nav";

export default async function BrandLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, brand_id, brands(name)")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "brand") redirect("/dashboard");

  const brandName =
    (profile.brands as { name: string } | null)?.name ?? "Mi tienda";

  return (
    <div className="min-h-screen flex flex-col">
      <BrandNav brandName={brandName} userName={profile.full_name ?? user.email ?? ""} />
      <main className="flex-1 container max-w-5xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
