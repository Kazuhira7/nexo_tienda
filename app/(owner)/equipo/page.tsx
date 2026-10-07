import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/require-module";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/empty-state";
import StaffDialog from "@/components/equipo/staff-dialog";
import ToggleStaffActive from "@/components/equipo/toggle-staff-active";
import { PERMISSIONS, type PermissionId } from "@/lib/permissions";

export default async function EquipoPage() {
  await requireModule("restaurant");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: members }, { data: withPin }, { data: profile }] = await Promise.all([
    supabase
      .from("staff_members")
      .select("*")
      .order("active", { ascending: false })
      .order("name"),
    supabase.rpc("staff_members_with_pin"),
    supabase.from("profiles").select("full_name").eq("id", user?.id ?? "").single(),
  ]);

  const pinSet = new Set((withPin as string[] | null) ?? []);
  const ownerInTeam = (members ?? []).some((m) => m.profile_id === user?.id);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Equipo</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Cada persona entra a los dispositivos del local con su PIN de 4 dígitos
          </p>
        </div>
        <StaffDialog trigger={<Button variant="cta">+ Persona</Button>} />
      </div>

      {!ownerInTeam && (
        <div className="rounded-xl border border-dashed bg-primary/5 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Agrégate al equipo</p>
            <p className="text-xs text-muted-foreground">
              Para tomar órdenes, cobrar o autorizar anulaciones en el salón también necesitas tu PIN.
            </p>
          </div>
          <StaffDialog
            selfName={profile?.full_name ?? ""}
            trigger={<Button variant="outline" className="shrink-0">Crear mi PIN</Button>}
          />
        </div>
      )}

      {!members?.length ? (
        <EmptyState
          icon="users"
          title="Aún no hay equipo"
          description="Agrega a tus meseros, cajeros y cocina. Cada quien tendrá su PIN y sus permisos."
        />
      ) : (
        <div className="rounded-xl border bg-card divide-y">
          {members.map((m, idx) => (
            <div key={m.id} style={{ "--i": idx } as React.CSSProperties}
              className={`animate-enter px-4 py-3 flex items-start gap-3 transition-opacity duration-300 ${m.active ? "" : "opacity-60"}`}>
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold">{m.name}</p>
                  <span className="text-sm text-muted-foreground">· {m.position}</span>
                  {m.profile_id === user?.id && <Badge variant="secondary">Tú</Badge>}
                  {!pinSet.has(m.id) && <Badge variant="destructive">Sin PIN</Badge>}
                  {!m.active && <Badge variant="outline">Inactivo</Badge>}
                </div>
                <div className="flex flex-wrap gap-1">
                  {m.permissions.length === 0 ? (
                    <span className="text-xs text-muted-foreground">Sin permisos</span>
                  ) : (
                    m.permissions.map((p) => (
                      <Badge key={p} variant="outline" className="font-normal">
                        {PERMISSIONS[p as PermissionId]?.label ?? p}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <ToggleStaffActive id={m.id} active={m.active} />
                <StaffDialog
                  member={m}
                  hasPin={pinSet.has(m.id)}
                  trigger={<Button variant="ghost" size="sm">Editar</Button>}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
