"use client";

import { useEffect } from "react";

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Restore theme and dark mode from localStorage on mount
    const theme = localStorage.getItem("nexo-theme") ?? "default";
    const dark = localStorage.getItem("nexo-dark") === "true";

    if (theme !== "default") {
      document.documentElement.setAttribute("data-theme", theme);
    }
    if (dark) {
      document.documentElement.classList.add("dark");
    }
  }, []);

  return <>{children}</>;
}
