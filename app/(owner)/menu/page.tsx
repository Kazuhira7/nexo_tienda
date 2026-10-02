import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/require-module";
import { getMoney } from "@/lib/get-currency";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/empty-state";
import NameOrderDialog from "@/components/restaurante/name-order-dialog";
import MenuItemDialog from "@/components/restaurante/menu/menu-item-dialog";
import ModifierGroupDialog from "@/components/restaurante/menu/modifier-group-dialog";
import { ActionSwitch, DeleteActionButton } from "@/components/restaurante/action-controls";
import {
  deleteCategory, deleteMenuItem, deleteModifierGroup, saveCategory, toggleMenuItemAvailable,
} from "./actions";

export default async function MenuPage() {
  await requireModule("restaurant");
  const fmt = await getMoney();
  const supabase = await createClient();

  const [{ data: categories }, { data: items }, { data: groups }, { data: modifiers }, { data: links }] =
    await Promise.all([
      supabase.from("menu_categories").select("*").order("sort_order").order("name"),
      supabase.from("menu_items").select("*").order("sort_order").order("name"),
      supabase.from("modifier_groups").select("*").order("name"),
      supabase.from("modifiers").select("*").order("sort_order").order("name"),
      supabase.from("menu_item_modifier_groups").select("menu_item_id, group_id").order("sort_order"),
    ]);

  const allCategories = categories ?? [];
  const allItems      = items ?? [];
  const allGroups     = groups ?? [];
  const allModifiers  = modifiers ?? [];
  const allLinks      = links ?? [];

  const groupIdsOf   = (itemId: string) => allLinks.filter((l) => l.menu_item_id === itemId).map((l) => l.group_id);
  const groupName    = (id: string) => allGroups.find((g) => g.id === id)?.name ?? "";
  const optionsOf    = (groupId: string) => allModifiers.filter((m) => m.group_id === groupId);
  const usedByCount  = (groupId: string) => allLinks.filter((l) => l.group_id === groupId).length;

  const sections = [
    ...allCategories.map((c) => ({ category: c, items: allItems.filter((i) => i.category_id === c.id) })),
    { category: null, items: allItems.filter((i) => !i.category_id) },
  ].filter((s) => s.category || s.items.length > 0);

  const soldOut = allItems.filter((i) => i.active && !i.available).length;

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Menú</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {allItems.filter((i) => i.active).length} platillos activos
            {soldOut > 0 && <span className="text-destructive font-medium"> · {soldOut} agotado{soldOut > 1 ? "s" : ""}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <NameOrderDialog title="Nueva categoría" action={saveCategory.bind(null, null)}
            placeholder="Platos fuertes, Para picar, Postres…" successText="Categoría creada"
            trigger={<Button variant="outline">+ Categoría</Button>} />
          <MenuItemDialog categories={allCategories} groups={allGroups}
            defaultCategoryId={allCategories[0]?.id ?? null}
            trigger={<Button variant="cta">+ Platillo</Button>} />
        </div>
      </div>

      {/* ── Platillos por categoría ── */}
      {sections.length === 0 ? (
        <EmptyState
          icon="receipt"
          title="Tu menú está vacío"
          description="Crea tus categorías (ej. Platos fuertes, Para picar, Postres) y agrega los platillos con su precio."
          action={
            <NameOrderDialog title="Nueva categoría" action={saveCategory.bind(null, null)}
              placeholder="Platos fuertes, Para picar, Postres…" successText="Categoría creada"
              trigger={<Button variant="cta">Crear primera categoría</Button>} />
          }
        />
      ) : (
        sections.map(({ category, items: sectionItems }) => (
          <section key={category?.id ?? "none"} className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 min-w-0">
                <h2 className="font-semibold truncate">{category?.name ?? "Sin categoría"}</h2>
                <span className="text-sm text-muted-foreground mr-1">({sectionItems.length})</span>
                {category && (
                  <>
                    <NameOrderDialog title="Editar categoría" action={saveCategory.bind(null, category.id)}
                      initial={{ name: category.name, sort_order: category.sort_order }}
                      successText="Categoría actualizada"
                      trigger={<Button variant="ghost" size="sm">Editar</Button>} />
                    <DeleteActionButton
                      action={deleteCategory.bind(null, category.id)}
                      confirmText={`¿Eliminar la categoría "${category.name}"? Sus platillos quedan sin categoría.`}
                      successText="Categoría eliminada"
                      title="Eliminar categoría"
                    />
                  </>
                )}
              </div>
              <MenuItemDialog categories={allCategories} groups={allGroups}
                defaultCategoryId={category?.id ?? null}
                trigger={<Button variant="outline" size="sm">+ Platillo</Button>} />
            </div>

            {sectionItems.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded-xl border border-dashed px-4 py-6 text-center">
                Sin platillos en esta categoría
              </p>
            ) : (
              <div className="rounded-xl border bg-card divide-y">
                {sectionItems.map((item) => {
                  const itemGroups = groupIdsOf(item.id);
                  return (
                    <div key={item.id} className={`px-4 py-3 flex items-center gap-3 ${item.active ? "" : "opacity-60"}`}>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{item.name}</p>
                          {!item.active && <Badge variant="outline">Inactivo</Badge>}
                          {item.active && !item.available && <Badge variant="destructive">Agotado</Badge>}
                          {item.prep_station === "bar" && <Badge variant="secondary">Barra</Badge>}
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                        )}
                        {itemGroups.length > 0 && (
                          <p className="text-xs text-muted-foreground">+ {itemGroups.map(groupName).join(", ")}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold">{fmt(item.price)}</p>
                        {item.cost != null && (
                          <p className="text-xs text-muted-foreground">costo {fmt(item.cost)}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-center gap-0.5 shrink-0" title="Disponible / Agotado">
                        <ActionSwitch checked={item.available}
                          action={toggleMenuItemAvailable.bind(null, item.id)}
                          label={item.available ? "Marcar agotado" : "Marcar disponible"} />
                        <span className="text-[10px] text-muted-foreground">
                          {item.available ? "Disponible" : "Agotado"}
                        </span>
                      </div>
                      <div className="flex items-center shrink-0">
                        <MenuItemDialog categories={allCategories} groups={allGroups}
                          item={item} itemGroupIds={itemGroups}
                          trigger={<Button variant="ghost" size="sm">Editar</Button>} />
                        <DeleteActionButton
                          action={deleteMenuItem.bind(null, item.id)}
                          confirmText={`¿Eliminar "${item.name}" del menú?`}
                          successText="Platillo eliminado"
                          title="Eliminar platillo"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ))
      )}

      {/* ── Extras y opciones ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">Extras y opciones</h2>
            <p className="text-xs text-muted-foreground">
              Ej. &quot;Extras&quot; con costo adicional o &quot;Término de la carne&quot;. Se asignan a cada platillo.
            </p>
          </div>
          <ModifierGroupDialog trigger={<Button variant="outline" size="sm">+ Extras</Button>} />
        </div>

        {allGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-xl border border-dashed px-4 py-6 text-center">
            Aún no hay extras ni opciones
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {allGroups.map((g) => {
              const opts = optionsOf(g.id);
              const used = usedByCount(g.id);
              return (
                <div key={g.id} className="rounded-xl border bg-card p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">{g.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {g.min_select > 0 ? "Obligatorio" : "Opcional"} · hasta {g.max_select} ·{" "}
                        {used === 0 ? "sin platillos" : `${used} platillo${used > 1 ? "s" : ""}`}
                      </p>
                    </div>
                    <div className="flex items-center shrink-0">
                      <ModifierGroupDialog group={g} options={opts}
                        trigger={<Button variant="ghost" size="sm">Editar</Button>} />
                      <DeleteActionButton
                        action={deleteModifierGroup.bind(null, g.id)}
                        confirmText={`¿Eliminar "${g.name}"? Se quita de todos los platillos.`}
                        successText="Extras eliminados"
                        title="Eliminar grupo"
                      />
                    </div>
                  </div>
                  <ul className="text-sm space-y-0.5">
                    {opts.map((o) => (
                      <li key={o.id} className="flex justify-between gap-2">
                        <span className="truncate">{o.name}</span>
                        <span className="text-muted-foreground shrink-0">
                          {o.price_delta === 0 ? "sin costo" : `+${fmt(o.price_delta)}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
