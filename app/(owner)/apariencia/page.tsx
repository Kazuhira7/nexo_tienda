import AparienciaForm from "@/components/apariencia/apariencia-form";

export default function AparienciaPage() {
  return (
    <div className="space-y-6 max-w-md">
      <div>
        <h1 className="text-2xl font-bold">Apariencia</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Personaliza cómo se ve la interfaz. Estas preferencias se guardan en tu navegador.
        </p>
      </div>
      <AparienciaForm />
    </div>
  );
}
