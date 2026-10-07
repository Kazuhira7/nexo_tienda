import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/require-module";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/empty-state";
import NameOrderDialog from "@/components/restaurante/name-order-dialog";
import TableDialog from "@/components/restaurante/mesas/table-dialog";
import { ActionSwitch, DeleteActionButton } from "@/components/restaurante/action-controls";
import { deleteArea, deleteTable, saveArea, toggleTableActive } from "./actions";
import type { Database } from "@/types/database";

type Table = Database["public"]["Tables"]["dining_tables"]["Row"];

const STATUS_LABEL = { free: "Libre", occupied: "Ocupada", bill_requested: "Cuenta pedida" } as const;

// Next number to suggest: highest trailing number in the group + 1
function nextNumber(tables: Table[]): number {
  const nums = tables.map((t) => Number(t.name.match(/(\d+)\s*$/)?.[1] ?? 0));
  return (nums.length ? Math.max(...nums) : 0) + 1;
}

export default async function MesasPage() {
  await requireModule("restaurant");
  const supabase = await createClient();
  const [{ data: areas }, { data: tables }] = await Promise.all([
    supabase.from("dining_areas").select("*").order("sort_order").order("name"),
    supabase.from("dining_tables").select("*").order("sort_order").order("name"),
  ]);

  const allAreas = areas ?? [];
  const allTables = tables ?? [];
  const groups = [
    ...allAreas.map((a) => ({ area: a, tables: allTables.filter((t) => t.area_id === a.id) })),
    { area: null, tables: allTables.filter((t) => !t.area_id) },
  ].filter((g) => g.area || g.tables.length > 0);

  const activeCount = allTables.filter((t) => t.active).length;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Mesas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeCount} {activeCount === 1 ? "espacio activo" : "espacios activos"} · áreas y mesas del local
          </p>
        </div>
        <div className="flex gap-2">
          <NameOrderDialog title="Nueva área" action={saveArea.bind(null, null)}
            placeholder="Salón, Kioscos, Terraza…" orderLabel="Orden en el salón" successText="Área creada"
            trigger={<Button variant="outline">+ Área</Button>} />
          <TableDialog areas={allAreas} trigger={<Button variant="cta">+ Mesas</Button>}
            defaultAreaId={allAreas[0]?.id ?? null} nextNumber={nextNumber(allTables)} />
        </div>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon="store"
          title="Aún no hay mesas"
          description='Crea un área (ej. "Salón" y "Kioscos") y luego agrega sus mesas de un solo golpe.'
          action={
            <NameOrderDialog title="Nueva área" action={saveArea.bind(null, null)}
              placeholder="Salón, Kioscos, Terraza…" orderLabel="Orden en el salón" successText="Área creada"
              trigger={<Button variant="cta">Crear primera área</Button>} />
          }
        />
      ) : (
        groups.map(({ area, tables: groupTables }) => (
          <section key={area?.id ?? "none"} className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="font-semibold truncate">{area?.name ?? "Sin área"}</h2>
                <span className="text-sm text-muted-foreground">({groupTables.length})</span>
                {area && (
                  <>
                    <NameOrderDialog title="Editar área" action={saveArea.bind(null, area.id)}
                      initial={{ name: area.name, sort_order: area.sort_order }}
                      orderLabel="Orden en el salón" successText="Área actualizada"
                      trigger={<Button variant="ghost" size="sm">Editar</Button>} />
                    <DeleteActionButton
                      action={deleteArea.bind(null, area.id)}
                      confirmText={`¿Eliminar el área "${area.name}"? Sus mesas quedan sin área.`}
                      successText="Área eliminada"
                      title="Eliminar área"
                    />
                  </>
                )}
              </div>
              <TableDialog areas={allAreas} defaultAreaId={area?.id ?? null}
                nextNumber={nextNumber(groupTables)}
                trigger={<Button variant="outline" size="sm">+ Mesas</Button>} />
            </div>

            {groupTables.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded-xl border border-dashed px-4 py-6 text-center">
                Sin mesas en esta área
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {groupTables.map((t, idx) => (
                  <div key={t.id} style={{ "--i": idx } as React.CSSProperties}
                    className={`animate-enter rounded-xl border bg-card p-3 space-y-2 transition-opacity duration-300 ${t.active ? "" : "opacity-60"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.seats} puestos</p>
                      </div>
                      <ActionSwitch checked={t.active} action={toggleTableActive.bind(null, t.id)}
                        label={t.active ? "Desactivar mesa" : "Activar mesa"} />
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      {t.status !== "free" ? (
                        <Badge variant="secondary">{STATUS_LABEL[t.status]}</Badge>
                      ) : !t.active ? (
                        <Badge variant="outline">Inactiva</Badge>
                      ) : <span />}
                      <div className="flex items-center">
                        <TableDialog areas={allAreas} table={t}
                          trigger={<Button variant="ghost" size="sm">Editar</Button>} />
                        <DeleteActionButton
                          action={deleteTable.bind(null, t.id)}
                          confirmText={`¿Eliminar ${t.name}?`}
                          successText="Mesa eliminada"
                          title="Eliminar mesa"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))
      )}
    </div>
  );
}
