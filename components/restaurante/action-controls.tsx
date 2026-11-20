"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";
import { Switch } from "@/components/ui/switch";

type ActionResult = { error?: string } | { success: true };

// Small controls that receive a (bound) Server Action from a Server Component,
// e.g. <ActionSwitch action={toggleTableActive.bind(null, table.id)} />.

export function ActionSwitch({
  checked,
  action,
  label,
}: {
  checked: boolean;
  action:  (checked: boolean) => Promise<ActionResult>;
  label?:  string;
}) {
  const [pending, start] = useTransition();
  return (
    <Switch
      checked={checked}
      disabled={pending}
      aria-label={label}
      onCheckedChange={(value) =>
        start(async () => {
          const result = await action(value);
          if ("error" in result && result.error) toast.error(result.error);
        })
      }
    />
  );
}

export function DeleteActionButton({
  action,
  confirmText,
  successText = "Eliminado",
  title = "Eliminar",
}: {
  action:       () => Promise<ActionResult>;
  confirmText:  string;
  successText?: string;
  title?:       string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={pending}
      onClick={() => {
        if (!confirm(confirmText)) return;
        start(async () => {
          const result = await action();
          if ("error" in result && result.error) toast.error(result.error);
          else toast.success(successText);
        });
      }}
      className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50 p-1.5"
    >
      <Trash2Icon className="size-4" />
    </button>
  );
}
