"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboardIcon,
  ShoppingCartIcon,
  ReceiptIcon,
  PackageIcon,
  MoreHorizontalIcon,
  WalletIcon,
  UsersIcon,
  StoreIcon,
  UploadIcon,
  UserIcon,
  SettingsIcon,
  CalculatorIcon,
} from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const PRIMARY = [
  { href: "/dashboard",    label: "Inicio",   icon: LayoutDashboardIcon },
  { href: "/ventas/nueva", label: "Vender",    icon: ShoppingCartIcon },
  { href: "/ventas",       label: "Ventas",    icon: ReceiptIcon },
  { href: "/inventario",   label: "Inventario",icon: PackageIcon },
];

const MORE = [
  { href: "/caja",          label: "Cierre de caja", icon: CalculatorIcon },
  { href: "/liquidaciones", label: "Liquidaciones", icon: WalletIcon },
  { href: "/clientes",      label: "Clientes",      icon: UsersIcon },
  { href: "/marcas",        label: "Marcas",         icon: StoreIcon },
  { href: "/importar",      label: "Importar CSV",   icon: UploadIcon },
  { href: "/perfil",        label: "Mi perfil",      icon: UserIcon },
  { href: "/configuracion", label: "Configuración",  icon: SettingsIcon },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/ventas/nueva"
      ? pathname === href
      : pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  const isMoreActive = MORE.some((l) => isActive(l.href));

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-card border-t shadow-2xl">
        <div className="flex items-stretch h-16">
          {PRIMARY.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                isActive(href) ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className={`size-5 ${isActive(href) ? "text-primary" : ""}`} />
              {label}
              {isActive(href) && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
              )}
            </Link>
          ))}

          {/* Más */}
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
              isMoreActive ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <MoreHorizontalIcon className="size-5" />
            Más
          </button>
        </div>
      </nav>

      {/* Sheet de "Más" */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="h-auto rounded-t-2xl pb-safe">
          <div className="pt-2 pb-4">
            <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-5" />
            <div className="grid grid-cols-3 gap-2 px-2">
              {MORE.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-colors ${
                    isActive(href) ? "bg-primary/10 text-primary" : "bg-muted/50 text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="size-5" />
                  <span className="text-xs font-medium text-center leading-tight">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
