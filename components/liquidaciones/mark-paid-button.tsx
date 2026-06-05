"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markSettlementPaid } from "@/app/(owner)/liquidaciones/actions";

export default function MarkPaidButton({ settlementId }: { settlementId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="cta"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await markSettlementPaid(settlementId);
          if (result.error) toast.error(result.error);
          else toast.success("Liquidación marcada como pagada");
        })
      }
    >
      {pending ? "Guardando…" : "Marcar pagada"}
    </Button>
  );
}
