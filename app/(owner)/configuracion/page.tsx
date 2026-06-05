import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import OrgSettingsForm from "@/components/configuracion/org-settings-form";

export default async function ConfiguracionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user!.id)
    .single();

  if (!profile?.organization_id) redirect("/dashboard");

  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", profile.organization_id)
    .single();

  if (!org) redirect("/dashboard");

  return (
    <div className="space-y-8 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Ajusta los parámetros de tu tienda colectiva
        </p>
      </div>
      <OrgSettingsForm org={org} />
    </div>
  );
}
