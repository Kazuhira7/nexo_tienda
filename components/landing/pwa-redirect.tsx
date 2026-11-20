"use client";

import { useEffect } from "react";

// The installed app (home-screen icon) must open on sign-in, never on the sales page.
// New installs already start at /login (app/manifest.ts); this covers older installs that start at "/".
export default function PwaRedirect() {
  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true; // iOS
    if (standalone) window.location.replace("/login");
  }, []);

  return null;
}
