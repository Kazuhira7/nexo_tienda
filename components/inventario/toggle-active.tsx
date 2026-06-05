"use client";

import { useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { toggleProductActive } from "@/app/(owner)/inventario/actions";

export default function ToggleProductActive({
  id,
  active,
}: {
  id: string;
  active: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Switch
      checked={active}
      disabled={pending}
      onCheckedChange={(checked) => {
        startTransition(async () => { await toggleProductActive(id, checked); });
      }}
    />
  );
}
