"use client";

import ThemeControls from "@/components/theme-controls";

export default function AparienciaForm() {
  return (
    <div className="space-y-6">
      {/* Paleta de colores */}
      <section className="rounded-xl border bg-card p-5 space-y-4">
        <div>
          <h2 className="font-semibold">Color del sistema</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Elige la paleta de colores principal. Solo afecta tu vista.
          </p>
        </div>
        <ThemeControls showLabels />
      </section>

      {/* Modo oscuro */}
      <section className="rounded-xl border bg-card p-5 space-y-4">
        <div>
          <h2 className="font-semibold">Modo de pantalla</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Cambia entre modo claro y oscuro según tu preferencia o las condiciones de luz.
          </p>
        </div>
        <ThemeControls showOnlyDark />
      </section>
    </div>
  );
}
