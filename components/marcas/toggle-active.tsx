"use client";

import { useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { toggleBrandActive } from "@/app/(owner)/marcas/actions";

export default function ToggleBrandActive({
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
        startTransition(async () => { await toggleBrandActive(id, checked); });
      }}
    />
  );
}
