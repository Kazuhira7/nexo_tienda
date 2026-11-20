import { requireModule } from "@/lib/require-module";
import EmptyState from "@/components/empty-state";

// Placeholder — the kitchen display (KDS) is R1 step 5 (docs/RESTAURANTE.md).
export default async function CocinaPage() {
  await requireModule("kitchen");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cocina</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Comandas en tiempo real</p>
      </div>
      <EmptyState
        icon="receipt"
        title="Pantalla de cocina — próximamente"
        description="Aquí llegarán las comandas enviadas desde el salón, la más antigua primero."
      />
    </div>
  );
}
