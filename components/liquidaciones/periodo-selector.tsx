"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { localDateString, periodLabel } from "@/lib/dates";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const pad = (n: number) => String(n).padStart(2, "0");

/** The last 8 half-months (1–15, 16–end), newest first, from calendar dates only (no time zone math). */
function getPeriods(today: string) {
  let [y, m] = today.split("-").map(Number);
  let firstHalf = Number(today.slice(8, 10)) <= 15;
  const periods: { from: string; to: string; label: string }[] = [];
  while (periods.length < 8) {
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const from = `${y}-${pad(m)}-${firstHalf ? "01" : "16"}`;
    const to = `${y}-${pad(m)}-${firstHalf ? "15" : pad(last)}`;
    periods.push({ from, to, label: periodLabel(from, to) });
    if (firstHalf) { m -= 1; if (m === 0) { m = 12; y -= 1; } }
    firstHalf = !firstHalf;
  }
  return periods;
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
  const periods = getPeriods(localDateString());
  const currentValue = `${currentFrom}|${currentTo}`;
  const currentLabel = periods.find((p) => p.from === currentFrom && p.to === currentTo)?.label
    ?? periodLabel(currentFrom, currentTo);

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
        <SelectTrigger className="h-8 text-sm w-64">
          <SelectValue>{currentLabel}</SelectValue>
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
