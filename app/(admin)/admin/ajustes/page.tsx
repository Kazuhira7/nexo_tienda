import { createClient } from "@/lib/supabase/server";
import SettingsForm from "@/components/admin/settings-form";

export default async function AjustesPage() {
  const supabase = await createClient();
  const [{ data: settings }, { data: log }] = await Promise.all([
    supabase.from("platform_settings").select("*").eq("id", 1).single(),
    supabase.from("admin_audit_log").select("id, actor_email, action, details, created_at, organizations(name)")
      .order("created_at", { ascending: false }).limit(30),
  ]);

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold font-heading">Ajustes de nexo</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Aplican a los negocios nuevos y a los que no tienen tarifa propia.
        </p>
      </div>
      {settings && <SettingsForm settings={settings} />}

      <div className="space-y-3">
        <h2 className="font-semibold">Últimos movimientos</h2>
        <div className="rounded-xl border bg-card divide-y">
          {(log ?? []).map((l) => (
            <div key={l.id} className="px-4 py-3 text-sm">
              <p className="font-medium">
                {l.action.replaceAll("_", " ")}
                {(l.organizations as { name: string } | null)?.name ? ` · ${(l.organizations as { name: string }).name}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(l.created_at).toLocaleString("es-NI", { timeZone: "America/Managua", dateStyle: "medium", timeStyle: "short" })}
                {l.actor_email ? ` · ${l.actor_email}` : ""}
              </p>
            </div>
          ))}
          {(log ?? []).length === 0 && <p className="px-4 py-6 text-center text-sm text-muted-foreground">Sin movimientos</p>}
        </div>
      </div>
    </div>
  );
}
