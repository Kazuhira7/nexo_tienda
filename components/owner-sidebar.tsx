"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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
import { Button } from "@/components/ui/button";
import UserMenu from "@/components/user-menu";

const NAV_SECTIONS = [
  {
    items: [
      { href: "/dashboard",    label: "Inicio",        icon: LayoutDashboardIcon },
    ],
  },
  {
    label: "Operaciones",
    items: [
      { href: "/ventas",        label: "Ventas",        icon: ReceiptIcon },
      { href: "/inventario",    label: "Inventario",    icon: PackageIcon },
      { href: "/marcas",        label: "Marcas",        icon: StoreIcon },
      { href: "/importar",      label: "Importar CSV",  icon: UploadIcon },
    ],
  },
  {
    label: "Clientes y Finanzas",
    items: [
      { href: "/clientes",      label: "Clientes",      icon: UsersIcon },
      { href: "/liquidaciones", label: "Liquidaciones", icon: WalletIcon },
    ],
  },
];

interface Props {
  userName: string;
  orgName?: string;
}

export default function OwnerSidebar({ userName, orgName }: Props) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  const linkClass = (href: string) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
      isActive(href)
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:text-foreground hover:bg-muted"
    }`;

  return (
    <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-56 border-r bg-card z-40">
      {/* Logo + org */}
      <div className="px-4 py-5 border-b">
        <Link href="/dashboard" className="block">
          <p className="text-xl font-bold font-heading text-primary leading-none">nexo</p>
          {orgName && (
            <p className="text-xs text-muted-foreground mt-1 truncate">{orgName}</p>
          )}
        </Link>
      </div>

      {/* Botón Vender — CTA prominente */}
      <div className="px-3 pt-4 pb-2">
        <Link href="/ventas/nueva">
          <Button
            variant="cta"
            className="w-full gap-2 font-semibold"
            size="default"
          >
            <ShoppingCartIcon className="size-4" />
            Nueva venta
          </Button>
        </Link>
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-5">
        {NAV_SECTIONS.map((section, si) => (
          <div key={si}>
            {section.label && (
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-3 mb-1">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className={linkClass(href)}>
                  <Icon className="size-4 shrink-0" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Fondo del sidebar */}
      <div className="border-t px-3 py-3 space-y-1">
        <Link href="/configuracion" className={linkClass("/configuracion")}>
          <SettingsIcon className="size-4 shrink-0" />
          Configuración
        </Link>
        <div className="pt-1">
          <UserMenu userName={userName} orgName={orgName} />
        </div>
      </div>
    </aside>
  );
}
