import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import CustomerDialog from "@/components/clientes/customer-dialog";
import EmptyState from "@/components/empty-state";

export default async function ClientesPage() {
  const supabase = await createClient();
  const { data: customers } = await supabase
    .from("customers").select("*").order("name");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{customers?.length ?? 0} clientes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Registro de clientes frecuentes</p>
        </div>
        <CustomerDialog
          trigger={<Button variant="cta">+ Nuevo cliente</Button>}
        />
      </div>

      {!customers?.length ? (
        <EmptyState
          icon="users"
          title="Sin clientes registrados"
          description="Los clientes son opcionales en las ventas, pero te ayudan a llevar seguimiento."
          action={<CustomerDialog trigger={<Button variant="cta">Registrar primer cliente</Button>} />}
        />
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden sm:block rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead className="hidden md:table-cell">Notas</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.phone ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{c.email ?? "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground truncate max-w-[180px]">{c.notes ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <CustomerDialog customer={c} trigger={<Button variant="ghost" size="sm">Editar</Button>} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Móvil — cards */}
          <div className="sm:hidden space-y-3">
            {customers.map((c) => (
              <div key={c.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">{c.name}</p>
                    <div className="flex gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                      {c.phone && <span>{c.phone}</span>}
                      {c.email && <span>{c.email}</span>}
                    </div>
                    {c.notes && <p className="text-xs text-muted-foreground mt-1 truncate">{c.notes}</p>}
                  </div>
                  <CustomerDialog customer={c} trigger={<Button variant="ghost" size="sm">Editar</Button>} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
