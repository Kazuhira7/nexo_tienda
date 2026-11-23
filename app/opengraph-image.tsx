import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SALES, formatNio } from "@/lib/site";

// Link preview card (WhatsApp, Facebook, Instagram…) on the brand surface. Rendered once at build time.
export const alt = "nexo: ventas, inventario y caja para tiendas colectivas y restaurantes en Nicaragua";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  // process.cwd() is the project root; fonts are OFL (assets/fonts)
  const [sora, jakarta] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/Sora-Bold.ttf")),
    readFile(join(process.cwd(), "assets/fonts/PlusJakartaSans-Medium.ttf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          padding: "64px 72px",
          color: "white",
          fontFamily: "Jakarta",
          backgroundColor: "#0B1E66",
          backgroundImage: "radial-gradient(120% 80% at 50% 30%, #2A5BFF 0%, #1B4FFF 38%, #1238C9 70%, #0B1E66 100%)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <span style={{ fontFamily: "Sora", fontSize: 54, letterSpacing: -1.5 }}>nexo</span>
            <span style={{ marginLeft: 14, fontSize: 22, color: "rgba(255,255,255,0.65)" }}>by AG Systems</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontFamily: "Sora", fontSize: 70, lineHeight: 1.05, letterSpacing: -2, maxWidth: 760 }}>
              Deja el cuaderno. Lleva tu negocio en nexo.
            </div>
            <div style={{ display: "flex", marginTop: 22, fontSize: 30, color: "rgba(255,255,255,0.82)" }}>
              Tiendas colectivas y restaurantes · Nicaragua
            </div>
          </div>

          <div style={{ display: "flex" }}>
            <div style={{
              display: "flex", backgroundColor: "#FF5C1A", borderRadius: 20, padding: "14px 26px",
              fontFamily: "Sora", fontSize: 28,
            }}>
              {`${SALES.trialDays} días gratis · luego ${formatNio(SALES.monthlyPriceNio)} al mes`}
            </div>
          </div>
        </div>

        {/* The "n" mark, as in the center of "la red de nexo" */}
        <div style={{ display: "flex", alignItems: "center", paddingLeft: 24 }}>
          <div style={{
            width: 240, height: 240, borderRadius: 9999, backgroundColor: "white",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 0 18px rgba(255,255,255,0.12)",
          }}>
            <svg width="150" height="150" viewBox="0 0 512 512">
              <path d="M168 376V196M168 268c0-56 38-92 92-92s88 36 88 96v104" stroke="#1B4FFF" strokeWidth={64}
                strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Sora", data: sora, weight: 700, style: "normal" },
        { name: "Jakarta", data: jakarta, weight: 500, style: "normal" },
      ],
    }
  );
}
