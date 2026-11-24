import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MfaForm from "@/components/auth/mfa-form";
import SignOutButton from "@/components/sign-out-button";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: `Verificación · ${BRAND.name}` };

// Second factor for the superadmin (018 requires an aal2 session for every admin permission).
export default async function VerificacionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "superadmin") redirect("/");

  return (
    <main className="min-h-[100svh] bg-background flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <p className="font-heading text-2xl font-bold">{BRAND.name} · Admin</p>
          <h1 className="text-lg font-semibold">Verificación en dos pasos</h1>
        </div>
        <div className="rounded-2xl border bg-card p-6">
          <MfaForm />
        </div>
        <div className="flex justify-center"><SignOutButton /></div>
      </div>
    </main>
  );
}
