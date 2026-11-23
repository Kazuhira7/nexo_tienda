"use client";

import { useSyncExternalStore } from "react";
import { SunIcon, MoonIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const THEMES = [
  { id: "default",   label: "Nexo",      color: "#1B4FFF" },
  { id: "rosa",      label: "Rosa",       color: "#C2185B" },
  { id: "esmeralda", label: "Esmeralda",  color: "#00796B" },
  { id: "ciruelo",   label: "Ciruelo",    color: "#6A1B9A" },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];

interface Props {
  showLabels?:   boolean;  // mostrar nombre bajo el color
  showOnlyDark?: boolean;  // mostrar solo el toggle de oscuro
}

// The saved preference lives in localStorage; read it as an external store (server: defaults).
const CHANGE_EVENT = "nexo-theme-change";
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}
function save(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* private mode: applies to this page only */ }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

export default function ThemeControls({ showLabels, showOnlyDark }: Props) {
  const dark  = useSyncExternalStore(subscribe, () => read("nexo-dark") === "true", () => false);
  const theme = useSyncExternalStore(subscribe, () => (read("nexo-theme") as ThemeId | null) ?? "default", () => "default" as ThemeId);

  function toggleDark() {
    const next = !dark;
    save("nexo-dark", String(next));
    if (next) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }

  function changeTheme(id: ThemeId) {
    save("nexo-theme", id);
    if (id === "default") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", id);
  }

  // Solo el toggle de oscuro/claro
  if (showOnlyDark) {
    return (
      <div className="flex gap-3">
        {[
          { label: "Claro",  value: false, icon: <SunIcon className="size-5" /> },
          { label: "Oscuro", value: true,  icon: <MoonIcon className="size-5" /> },
        ].map(({ label, value, icon }) => (
          <button
            key={label}
            onClick={() => { save("nexo-dark", String(value)); document.documentElement.classList.toggle("dark", value); }}
            className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              dark === value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            }`}
          >
            {icon}
            <span className="text-sm font-medium">{label}</span>
          </button>
        ))}
      </div>
    );
  }

  // Paletas con labels opcionales
  if (showLabels) {
    return (
      <div className="grid grid-cols-4 gap-3">
        {THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => changeTheme(t.id)}
            className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
              theme === t.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full ring-offset-background transition-all ${
                theme === t.id ? "ring-2 ring-offset-2 ring-foreground/30" : ""
              }`}
              style={{ backgroundColor: t.color }}
            />
            <span className="text-xs font-medium">{t.label}</span>
          </button>
        ))}
      </div>
    );
  }

  // Versión compacta para el sidebar (puntos pequeños + toggle luna/sol)
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        {THEMES.map((t) => (
          <button
            key={t.id}
            title={t.label}
            onClick={() => changeTheme(t.id)}
            className={`w-4 h-4 rounded-full ring-offset-background transition-all ${
              theme === t.id ? "ring-2 ring-offset-1 ring-foreground/30 scale-110" : "hover:scale-110 opacity-70 hover:opacity-100"
            }`}
            style={{ backgroundColor: t.color }}
          />
        ))}
      </div>
      <Button variant="ghost" size="icon" onClick={toggleDark} title={dark ? "Modo claro" : "Modo oscuro"} className="size-7">
        {dark ? <SunIcon className="size-3.5" /> : <MoonIcon className="size-3.5" />}
      </Button>
    </div>
  );
}
