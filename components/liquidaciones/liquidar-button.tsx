"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createSettlement } from "@/app/(owner)/liquidaciones/actions";

interface Props {
  brandId: string;
  periodStart: string;
  periodEnd: string;
  grossSales: number;
  spaceFee: number;
}

export default function LiquidarButton({
  brandId, periodStart, periodEnd, grossSales, spaceFee,
}: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await createSettlement(brandId, periodStart, periodEnd, grossSales, spaceFee);
          if (result.error) toast.error(result.error);
          else toast.success("Marca liquidada");
        })
      }
    >
      {pending ? "Liquidando…" : "Liquidar"}
    </Button>
  );
}
