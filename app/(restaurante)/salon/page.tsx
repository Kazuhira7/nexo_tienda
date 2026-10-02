import { requireModule } from "@/lib/require-module";
import EmptyState from "@/components/empty-state";

// Placeholder — the table map is R1 step 3 (docs/RESTAURANTE.md).
export default async function SalonPage() {
  await requireModule("restaurant");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Salón</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Mapa de mesas y órdenes abiertas</p>
      </div>
      <EmptyState
        icon="store"
        title="Salón — próximamente"
        description="Aquí verás las mesas por área, su estado y el total de cada orden."
      />
    </div>
  );
}
