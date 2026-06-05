import NewOrgForm from "@/components/admin/new-org-form";

export default function NuevaOrgPage() {
  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold">Nuevo negocio</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Crea un negocio y su usuario dueña. El acceso queda listo de inmediato.
        </p>
      </div>
      <NewOrgForm />
    </div>
  );
}
