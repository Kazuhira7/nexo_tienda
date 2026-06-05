import CSVImporter from "@/components/importar/csv-importer";

export default function ImportarPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Importar inventario</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sube un archivo CSV para cargar productos de varias marcas a la vez.
        </p>
      </div>
      <CSVImporter />
    </div>
  );
}
