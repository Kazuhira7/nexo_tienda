// Single navigation registry for the app shell (sidebar, mobile header, bottom nav).
// Items are filtered by enabled module and by auth role — never hardcode per business type.
import {
  LayoutDashboardIcon,
  ShoppingCartIcon,
  ReceiptIcon,
  PackageIcon,
  WalletIcon,
  UsersIcon,
  StoreIcon,
  UploadIcon,
  UserIcon,
  SettingsIcon,
  CalculatorIcon,
  UtensilsCrossedIcon,
  ChefHatIcon,
  IdCardIcon,
  BookOpenIcon,
  LayoutGridIcon,
} from "lucide-react";
import type { ModuleId, UserRole } from "@/types/database";

export interface NavItem {
  href:     string;
  label:    string;
  icon:     typeof LayoutDashboardIcon;
  module?:  ModuleId;         // undefined = always visible
  roles?:   UserRole[];       // undefined = owner only
  section:  "main" | "operations" | "finance" | "account";
  mobile:   "primary" | "more";
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard",     label: "Inicio",         icon: LayoutDashboardIcon, section: "main",       mobile: "primary" },
  { href: "/salon",         label: "Salón",          icon: UtensilsCrossedIcon, section: "main",       mobile: "primary", module: "restaurant", roles: ["owner", "terminal"] },
  { href: "/cocina",        label: "Cocina",         icon: ChefHatIcon,         section: "main",       mobile: "primary", module: "kitchen",    roles: ["owner", "terminal"] },
  { href: "/ventas/nueva",  label: "Vender",         icon: ShoppingCartIcon,    section: "main",       mobile: "primary", module: "pos" },
  { href: "/ventas",        label: "Ventas",         icon: ReceiptIcon,         section: "operations", mobile: "primary", module: "pos" },
  { href: "/inventario",    label: "Inventario",     icon: PackageIcon,         section: "operations", mobile: "primary", module: "inventory" },
  { href: "/menu",          label: "Menú",           icon: BookOpenIcon,        section: "operations", mobile: "more",    module: "restaurant" },
  { href: "/mesas",         label: "Mesas",          icon: LayoutGridIcon,      section: "operations", mobile: "more",    module: "restaurant" },
  { href: "/equipo",        label: "Equipo",         icon: IdCardIcon,          section: "operations", mobile: "more",    module: "restaurant" },
  { href: "/marcas",        label: "Marcas",         icon: StoreIcon,           section: "operations", mobile: "more",    module: "brands" },
  { href: "/importar",      label: "Importar CSV",   icon: UploadIcon,          section: "operations", mobile: "more",    module: "inventory" },
  { href: "/caja",          label: "Cierre de caja", icon: CalculatorIcon,      section: "finance",    mobile: "more",    module: "cash" },
  { href: "/clientes",      label: "Clientes",       icon: UsersIcon,           section: "finance",    mobile: "more",    module: "customers" },
  { href: "/liquidaciones", label: "Liquidaciones",  icon: WalletIcon,          section: "finance",    mobile: "more",    module: "settlements" },
  { href: "/perfil",        label: "Mi perfil",      icon: UserIcon,            section: "account",    mobile: "more" },
  { href: "/configuracion", label: "Configuración",  icon: SettingsIcon,        section: "account",    mobile: "more" },
];

export const NAV_SECTION_LABELS: Record<NavItem["section"], string | undefined> = {
  main:       undefined,
  operations: "Operaciones",
  finance:    "Clientes y Finanzas",
  account:    undefined,
};

export function visibleNavItems(modules: readonly string[], role: UserRole): NavItem[] {
  return NAV_ITEMS.filter(
    (i) =>
      (!i.module || modules.includes(i.module)) &&
      (i.roles ?? ["owner"]).includes(role)
  );
}

/** "/ventas/nueva" must not light up "/ventas"; "/dashboard" only matches exactly. */
export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/ventas/nueva" || href === "/dashboard") return pathname === href;
  if (href === "/ventas") return pathname.startsWith("/ventas") && !pathname.startsWith("/ventas/nueva");
  return pathname === href || pathname.startsWith(`${href}/`);
}
