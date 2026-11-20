"use client";

import { useLinkStatus } from "next/link";

// Render inside a <Link>: shows instant feedback while that navigation is pending.
export default function NavPending({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={`size-1.5 rounded-full bg-current transition-opacity duration-200 ${
        pending ? "opacity-100 animate-pulse" : "opacity-0"
      } ${className ?? ""}`}
    />
  );
}
