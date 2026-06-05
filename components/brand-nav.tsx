"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  MenuIcon,
  LayoutDashboardIcon,
  PackageIcon,
  ReceiptIcon,
} from "lucide-react";
import ThemeControls from "@/components/theme-controls";

const NAV_LINKS = [
  { href: "/mi-tienda",     label: "Inicio",        icon: LayoutDashboardIcon },
  { href: "/mi-inventario", label: "Mi inventario", icon: PackageIcon },
  { href: "/mis-ventas",    label: "Mis ventas",    icon: ReceiptIcon },
];

export default function BrandNav({
  brandName,
  userName,
}: {
  brandName: string;
  userName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const linkClass = (href: string) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      pathname === href
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:text-foreground hover:bg-muted"
    }`;

  return (
    <header className="sticky top-0 z-50 border-b bg-card shadow-sm">
      <div className="container max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/mi-tienda" className="text-xl font-bold font-heading text-primary shrink-0">
            nexo
          </Link>
          <span className="hidden sm:block text-sm text-muted-foreground truncate">{brandName}</span>
        </div>

        {/* Nav desktop */}
        <nav className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={linkClass(href)}>
              <Icon className="size-3.5" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <ThemeControls />
          <span className="text-sm text-muted-foreground truncate max-w-[120px]">{userName}</span>
          <Button variant="outline" size="sm" onClick={handleLogout}>Salir</Button>
        </div>

        {/* Hamburger móvil */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden" />}>
            <MenuIcon className="size-5" />
          </SheetTrigger>
          <SheetContent side="right" className="w-64 p-0">
            <div className="flex flex-col h-full">
              <div className="px-4 py-4 border-b">
                <p className="text-xl font-bold font-heading text-primary">nexo</p>
                <p className="text-sm font-medium mt-0.5">{brandName}</p>
                <p className="text-xs text-muted-foreground truncate">{userName}</p>
              </div>
              <nav className="flex-1 py-3 px-3 space-y-1">
                {NAV_LINKS.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={`block ${linkClass(href)}`}
                  >
                    <Icon className="size-4" />
                    {label}
                  </Link>
                ))}
              </nav>
              <div className="px-4 py-4 border-t">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => { setOpen(false); handleLogout(); }}
                >
                  Salir
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
