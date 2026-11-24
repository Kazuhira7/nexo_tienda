// Product identity in ONE place: name, maker, palette and logo mark. A rebrand starts here
// (plus the --color-brand-* tokens and --primary/--accent in app/globals.css, which must match).
// Pure data — safe on client and server, and in the OG image renderer (which can't read CSS).

export const BRAND = {
  /** Wordmark, as drawn in the logo (lowercase by design). */
  name: "nexo",
  /** In titles and sentences that start with it. */
  displayName: "Nexo",
  /** Maker shown in "Desarrollado por …". */
  company: "AG Systems",
  colors: {
    primary: "#1B4FFF", // main brand color (buttons, links, mark)
    accent:  "#FF5C1A", // main call to action only
    deep:    "#0B1E66", // dark brand surface
    bright:  "#2A5BFF", // light end of the brand gradient
    mid:     "#1238C9", // middle of the brand gradient
  },
  /** Logo mark (the "n"), drawn on a 512×512 grid as a single stroked path. */
  markPath: "M168 376V196M168 268c0-56 38-92 92-92s88 36 88 96v104",
} as const;

/** "Restaurante · nexo" style titles. */
export function pageTitle(title: string): string {
  return `${title} · ${BRAND.name}`;
}
