"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import UserMenu from "@/components/user-menu";
import {
  MenuIcon,
  LayoutDashboardIcon,
  ShoppingCartIcon,
  ReceiptIcon,
  PackageIcon,
  UsersIcon,
  StoreIcon,
  WalletIcon,
  UploadIcon,
} from "lucide-react";

const NAV_LINKS = [
  { href: "/dashboard",     label: "Inicio",        icon: LayoutDashboardIcon },
  { href: "/ventas/nueva",  label: "Vender",         icon: ShoppingCartIcon },
  { href: "/ventas",        label: "Ventas",         icon: ReceiptIcon },
  { href: "/inventario",    label: "Inventario",     icon: PackageIcon },
  { href: "/liquidaciones", label: "Liquidaciones",  icon: WalletIcon },
  { href: "/clientes",      label: "Clientes",       icon: UsersIcon },
  { href: "/marcas",        label: "Marcas",         icon: StoreIcon },
  { href: "/importar",      label: "Importar",       icon: UploadIcon },
];

interface Props { userName: string; orgName?: string }

export default function OwnerNav({ userName, orgName }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/ventas/nueva"
      ? pathname === href
      : pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  const linkClass = (href: string) =>
    `flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      isActive(href)
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:text-foreground hover:bg-muted"
    }`;

  return (
    <header className="sticky top-0 z-50 border-b bg-card shadow-sm">
      <div className="container max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        {/* Logo + nombre del negocio */}
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/dashboard" className="text-xl font-bold font-heading text-primary">
            nexo
          </Link>
          {orgName && (
            <span className="hidden lg:block text-xs text-muted-foreground border-l pl-2 max-w-[140px] truncate">
              {orgName}
            </span>
          )}
        </div>

        {/* Nav desktop */}
        <nav className="hidden lg:flex items-center gap-0.5 flex-1 overflow-x-auto">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={linkClass(href)}>
              <Icon className="size-3.5 shrink-0" />
              <span className="hidden xl:block">{label}</span>
            </Link>
          ))}
        </nav>

        {/* Acciones desktop */}
        <div className="hidden lg:block">
          <UserMenu userName={userName} orgName={orgName} />
        </div>

        {/* Hamburger + avatar móvil */}
        <div className="flex lg:hidden items-center gap-2">
          <UserMenu userName={userName} orgName={orgName} />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon" />}>
              <MenuIcon className="size-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-64 p-0">
              <div className="flex flex-col h-full">
                <div className="px-4 py-4 border-b bg-muted/30">
                  <p className="text-xl font-bold font-heading text-primary">nexo</p>
                  {orgName && <p className="text-xs text-muted-foreground mt-0.5 truncate">{orgName}</p>}
                </div>
                <nav className="flex-1 py-2 px-3 space-y-0.5 overflow-y-auto">
                  {NAV_LINKS.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 ${linkClass(href)}`}
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
      </div>
    </header>
  );
}
