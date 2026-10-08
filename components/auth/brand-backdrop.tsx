// Nexo brand surface: deep blue radial + fine dot grid. Used by the sign-in hero and the PIN lock screen.

export const BRAND_GRADIENT =
  "radial-gradient(120% 80% at 50% 30%, #2A5BFF 0%, #1B4FFF 38%, #1238C9 70%, #0B1E66 100%)";

export default function BrandBackdrop() {
  return (
    <>
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: BRAND_GRADIENT }} />
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
    </>
  );
}
