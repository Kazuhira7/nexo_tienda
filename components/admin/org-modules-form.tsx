"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateOrgModules } from "@/app/(admin)/admin/[orgId]/actions";
import { MODULES, MODULE_IDS } from "@/lib/modules";
import type { ModuleId } from "@/types/database";

interface Props {
  orgId:   string;
  enabled: ModuleId[];
}

export default function OrgModulesForm({ orgId, enabled }: Props) {
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<ModuleId[]>(enabled);

  const dirty =
    selected.length !== enabled.length ||
    selected.some((m) => !enabled.includes(m));

  function toggle(id: ModuleId) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  }

  function handleSave() {
    start(async () => {
      const result = await updateOrgModules(orgId, selected);
      if (result.error) toast.error(result.error);
      else toast.success("Módulos actualizados");
    });
  }

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {MODULE_IDS.map((id) => {
          const on = selected.includes(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              className={`flex items-start gap-2.5 p-3 rounded-xl border-2 text-left transition-all ${
                on ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 opacity-70"
              }`}
            >
              <span
                className={`mt-0.5 size-4 rounded flex items-center justify-center shrink-0 border ${
                  on ? "bg-primary border-primary text-primary-foreground" : "border-border"
                }`}
              >
                {on && <CheckIcon className="size-3" />}
              </span>
              <span>
                <p className="font-semibold text-sm leading-tight">{MODULES[id].label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{MODULES[id].description}</p>
              </span>
            </button>
          );
        })}
      </div>
      <Button
        onClick={handleSave}
        variant="cta"
        size="sm"
        disabled={pending || !dirty}
        className="w-full"
      >
        {pending ? "Guardando…" : "Guardar módulos"}
      </Button>
    </div>
  );
}
