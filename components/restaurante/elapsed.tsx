"use client";

import { useEffect, useState } from "react";

export function formatElapsed(fromIso: string, now: number): string {
  const minutes = Math.max(0, Math.floor((now - new Date(fromIso).getTime()) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  return `${h} h ${String(minutes % 60).padStart(2, "0")}`;
}

/** "12 min" / "1 h 05" since `since`, refreshed every 30 s. */
export default function Elapsed({ since, className }: { since: string; className?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  return <span className={className} suppressHydrationWarning>{formatElapsed(since, now)}</span>;
}
