"use client";

import { useEffect, useRef, useState } from "react";
import { useMoney } from "@/components/org-provider";

const DURATION_MS = 450;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

interface Props {
  value:     number;
  /** "money" formats with the org currency (amounts in NIO); "int" rounds. */
  format?:   "money" | "int";
  /** Count up from 0 on first render (KPIs); otherwise only animates changes. */
  fromZero?: boolean;
  className?: string;
}

// Counts smoothly to the new value whenever it changes (totals, balances, KPIs).
export default function AnimatedNumber({ value, format = "money", fromZero, className }: Props) {
  const fmt = useMoney();
  const [shown, setShown] = useState(fromZero ? 0 : value);
  const from = useRef(fromZero ? 0 : value);
  const [bump, setBump] = useState(0);

  useEffect(() => {
    const start = from.current;
    if (start === value) return;
    let frame = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / DURATION_MS);
      const current = start + (value - start) * easeOut(t);
      from.current = current;
      setShown(current);
      if (t < 1) frame = requestAnimationFrame(tick);
      else setBump((b) => b + 1);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  const text = format === "money" ? fmt(shown) : String(Math.round(shown));
  // Re-keying replays the "pop" each time a change finishes
  return (
    <span key={bump} className={`inline-block tabular-nums ${bump ? "animate-pop" : ""} ${className ?? ""}`}>
      {text}
    </span>
  );
}
