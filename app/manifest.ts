import type { MetadataRoute } from "next";

// Installable app (tablet / phone "Agregar a pantalla de inicio"): opens full screen.
// start_url "/login": signed-in devices bounce to their role's home (proxy), signed-out ones land on
// sign-in — "/" is the public sales page.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             "Nexo",
    short_name:       "Nexo",
    description:      "Gestión para tu negocio: ventas, salón y caja",
    start_url:        "/login",
    display:          "standalone",
    orientation:      "any",
    background_color: "#ffffff",
    theme_color:      "#1B4FFF",
    lang:             "es",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
