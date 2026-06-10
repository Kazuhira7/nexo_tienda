"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";
import { deleteBrandPayment } from "@/app/(owner)/marcas/[brandId]/actions";

export default function DeletePaymentButton({ id, brandId }: { id: string; brandId: string }) {
  const [pending, start] = useTransition();

  function handleDelete() {
    if (!confirm("¿Eliminar este movimiento? Esta acción no se puede deshacer.")) return;
    start(async () => {
      const result = await deleteBrandPayment(id, brandId);
      if (result.error) toast.error(result.error);
      else toast.success("Movimiento eliminado");
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={pending}
      title="Eliminar movimiento"
      className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50 p-1"
    >
      <Trash2Icon className="size-4" />
    </button>
  );
}
