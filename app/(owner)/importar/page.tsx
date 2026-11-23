import CSVImporter from "@/components/importar/csv-importer";
import { requireModule } from "@/lib/require-module";
import { getOrgContext } from "@/lib/org-context";

export default async function ImportarPage() {
  await requireModule("inventory");
  const { modules } = await getOrgContext();
  const useBrands = modules.includes("brands");
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Importar inventario</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {useBrands
            ? "Sube un archivo CSV para cargar productos de varias marcas a la vez."
            : "Sube un archivo CSV (puedes guardarlo desde Excel) para cargar todos tus productos de una vez."}
        </p>
      </div>
      <CSVImporter useBrands={useBrands} />
    </div>
  );
}
