import { createClient } from "@/lib/supabase/server";
import ProfileForm from "@/components/perfil/profile-form";
import PasswordForm from "@/components/perfil/password-form";

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, organizations(name)")
    .eq("id", user!.id)
    .single();

  const orgName = (profile?.organizations as { name: string } | null)?.name;

  return (
    <div className="space-y-8 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold">Mi perfil</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gestiona tu información personal y acceso
        </p>
      </div>

      {/* Avatar + info */}
      <div className="flex items-center gap-4 p-5 rounded-xl border bg-card">
        <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold shrink-0">
          {(profile?.full_name ?? user?.email ?? "?")[0].toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-lg">{profile?.full_name ?? "Sin nombre"}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          {orgName && (
            <p className="text-xs text-muted-foreground mt-1">
              {profile?.role === "owner" ? "Dueña" : "Marca"} · {orgName}
            </p>
          )}
        </div>
      </div>

      {/* Editar nombre */}
      <section className="space-y-4">
        <h2 className="font-semibold">Información personal</h2>
        <ProfileForm
          userId={user!.id}
          currentName={profile?.full_name ?? ""}
          email={user?.email ?? ""}
        />
      </section>

      {/* Cambiar contraseña */}
      <section className="space-y-4">
        <h2 className="font-semibold">Seguridad</h2>
        <PasswordForm />
      </section>
    </div>
  );
}
