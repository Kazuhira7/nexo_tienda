"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { toggleStaffActive } from "@/app/(owner)/equipo/actions";

export default function ToggleStaffActive({ id, active }: { id: string; active: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <Switch
      checked={active}
      disabled={pending}
      aria-label={active ? "Desactivar" : "Activar"}
      onCheckedChange={(checked) => {
        startTransition(async () => {
          const result = await toggleStaffActive(id, checked);
          if (result.error) toast.error(result.error);
        });
      }}
    />
  );
}
