"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function getPeriods() {
  const periods = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - Math.floor(i / 2), 1);
    const isFirstHalf = i % 2 === 0 ? now.getDate() > 15 || Math.floor(i / 2) > 0 : true;

    // Primera quincena
    if (i % 2 === 0) {
      const start = new Date(d.getFullYear(), d.getMonth() - Math.floor(i / 2), 1);
      const end = new Date(d.getFullYear(), d.getMonth() - Math.floor(i / 2), 15);
      const label = `1–15 ${start.toLocaleDateString("es-NI", { month: "long", year: "numeric" })}`;
      periods.push({
        label,
        from: start.toISOString().split("T")[0],
        to: end.toISOString().split("T")[0],
      });
    }
    // Segunda quincena
    const month = d.getMonth() - Math.floor((i + 1) / 2);
    const year = d.getFullYear();
    const start2 = new Date(year, month, 16);
    const end2 = new Date(year, month + 1, 0);
    const label2 = `16–${end2.getDate()} ${start2.toLocaleDateString("es-NI", { month: "long", year: "numeric" })}`;
    periods.push({
      label: label2,
      from: start2.toISOString().split("T")[0],
      to: end2.toISOString().split("T")[0],
    });
  }
  // Deduplica y ordena de más reciente a más antiguo
  const seen = new Set<string>();
  return periods
    .filter((p) => {
      if (seen.has(p.from)) return false;
      seen.add(p.from);
      return new Date(p.from) <= now;
    })
    .sort((a, b) => new Date(b.from).getTime() - new Date(a.from).getTime())
    .slice(0, 8);
}

export default function PeriodoSelector({
  currentFrom,
  currentTo,
}: {
  currentFrom: string;
  currentTo: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const periods = getPeriods();
  const currentValue = `${currentFrom}|${currentTo}`;

  function handleChange(val: string) {
    if (!val) return;
    const [from, to] = val.split("|");
    router.push(`${pathname}?from=${from}&to=${to}`);
  }

  const prev = () => {
    const idx = periods.findIndex((p) => p.from === currentFrom);
    if (idx < periods.length - 1) {
      const p = periods[idx + 1];
      router.push(`${pathname}?from=${p.from}&to=${p.to}`);
    }
  };

  const next = () => {
    const idx = periods.findIndex((p) => p.from === currentFrom);
    if (idx > 0) {
      const p = periods[idx - 1];
      router.push(`${pathname}?from=${p.from}&to=${p.to}`);
    }
  };

  const isLatest = periods[0]?.from === currentFrom;
  const isOldest = periods[periods.length - 1]?.from === currentFrom;

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={prev} disabled={isOldest}>
        ‹
      </Button>
      <Select value={currentValue} onValueChange={(val) => handleChange(val ?? "")}>
        <SelectTrigger className="h-8 text-sm w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {periods.map((p) => (
            <SelectItem key={p.from} value={`${p.from}|${p.to}`}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" size="sm" onClick={next} disabled={isLatest}>
        ›
      </Button>
    </div>
  );
}
