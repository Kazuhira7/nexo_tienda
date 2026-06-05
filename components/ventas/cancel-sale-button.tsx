"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cancelSale } from "@/app/(owner)/ventas/actions";

export default function CancelSaleButton({
  saleId,
  saleNumber,
}: {
  saleId: string;
  saleNumber: number;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={<Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" />}
      >
        Anular
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Anular venta #{saleNumber}?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción restaurará el stock de todos los productos de la venta.
            No se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await cancelSale(saleId);
                if (result.error) toast.error(result.error);
                else toast.success(`Venta #${saleNumber} anulada`);
              })
            }
          >
            {pending ? "Anulando…" : "Sí, anular"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
