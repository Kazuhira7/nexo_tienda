import { createClient } from "@/lib/supabase/server";
import PasswordForm from "@/components/perfil/password-form";

export default async function BrandProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, brands(name)")
    .eq("id", user!.id)
    .single();

  const brandName = (profile?.brands as { name: string } | null)?.name;

  return (
    <div className="space-y-6 max-w-md">
      <div>
        <h1 className="text-2xl font-bold">Mi perfil</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {profile?.full_name ?? user?.email}
          {brandName && ` · ${brandName}`}
        </p>
      </div>

      <div className="rounded-xl border bg-card p-5 space-y-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Correo de acceso</p>
        <p className="font-medium">{user?.email}</p>
      </div>

      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
          Cambiar contraseña
        </p>
        <PasswordForm />
      </div>
    </div>
  );
}
