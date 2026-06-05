"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { UserIcon, LogOutIcon, PaletteIcon } from "lucide-react";

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
  return (
    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 select-none">
      {initials || "?"}
    </div>
  );
}

interface Props { userName: string; orgName?: string }

export default function UserMenu({ userName, orgName }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left"
      >
        <Avatar name={userName} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate leading-tight">{userName}</p>
          {orgName && <p className="text-xs text-muted-foreground truncate leading-tight">{orgName}</p>}
        </div>
      </button>

      {open && (
        <div className="absolute left-0 bottom-full mb-2 w-52 rounded-xl border bg-card shadow-xl overflow-hidden z-[100]">
          {/* Cabecera */}
          <div className="px-4 py-3 bg-muted/40 border-b">
            <p className="font-semibold text-sm truncate">{userName}</p>
            {orgName && <p className="text-xs text-muted-foreground truncate">{orgName}</p>}
          </div>

          {/* Opciones personales */}
          <div className="py-1">
            <Link
              href="/perfil"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
            >
              <UserIcon className="size-4 text-muted-foreground" />
              Mi perfil y contraseña
            </Link>
            <Link
              href="/apariencia"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
            >
              <PaletteIcon className="size-4 text-muted-foreground" />
              Apariencia
            </Link>
          </div>

          {/* Salir */}
          <div className="border-t py-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOutIcon className="size-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
