import { BRAND } from "@/lib/brand";

/** The wordmark as text (font-heading, bold). Size and color come from className. */
export function BrandName({ className = "" }: { className?: string }) {
  return <span className={`font-heading font-bold tracking-tight ${className}`}>{BRAND.name}</span>;
}

/** The "n" mark alone, e.g. inside a circle or as an app icon. */
export function BrandMark({ className, color = "currentColor", strokeWidth = BRAND.markStroke }: {
  className?: string; color?: string; strokeWidth?: number;
}) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden>
      <path d={BRAND.markPath} stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
