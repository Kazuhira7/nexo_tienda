"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import UserMenu from "@/components/user-menu";
import {
  MenuIcon,
  LayoutDashboardIcon,
  ShoppingCartIcon,
  ReceiptIcon,
  PackageIcon,
  WalletIcon,
  UsersIcon,
  StoreIcon,
  UploadIcon,
  SettingsIcon,
} from "lucide-react";

const ALL_LINKS = [
  { href: "/dashboard",    label: "Inicio",        icon: LayoutDashboardIcon },
  { href: "/ventas/nueva", label: "Nueva venta",    icon: ShoppingCartIcon, cta: true },
  { href: "/ventas",       label: "Ventas",         icon: ReceiptIcon },
  { href: "/inventario",   label: "Inventario",     icon: PackageIcon },
  { href: "/marcas",       label: "Marcas",         icon: StoreIcon },
  { href: "/importar",     label: "Importar CSV",   icon: UploadIcon },
  { href: "/clientes",     label: "Clientes",       icon: UsersIcon },
  { href: "/liquidaciones",label: "Liquidaciones",  icon: WalletIcon },
  { href: "/configuracion",label: "Configuración",  icon: SettingsIcon },
];

interface Props { userName: string; orgName?: string }

export default function MobileHeader({ userName, orgName }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <header className="lg:hidden sticky top-0 z-50 border-b bg-card shadow-sm h-14 flex items-center justify-between px-4">
      <Link href="/dashboard" className="flex items-center gap-2">
        <span className="text-xl font-bold font-heading text-primary">nexo</span>
        {orgName && (
          <span className="text-xs text-muted-foreground border-l pl-2 truncate max-w-[120px]">
            {orgName}
          </span>
        )}
      </Link>

      <div className="flex items-center gap-2">
        <UserMenu userName={userName} orgName={orgName} />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button variant="ghost" size="icon" />}>
            <MenuIcon className="size-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex flex-col h-full">
              <div className="px-4 py-5 border-b bg-muted/30">
                <p className="text-xl font-bold font-heading text-primary">nexo</p>
                {orgName && <p className="text-xs text-muted-foreground mt-0.5 truncate">{orgName}</p>}
              </div>
              <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                {ALL_LINKS.map(({ href, label, icon: Icon, cta }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      cta
                        ? "bg-accent text-white hover:bg-accent/90 mt-2 mb-2"
                        : isActive(href)
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="size-4 shrink-0" />
                    {label}
                  </Link>
                ))}
              </nav>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
