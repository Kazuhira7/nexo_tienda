"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontalIcon } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { isNavActive, visibleNavItems } from "@/components/nav-items";
import type { UserRole } from "@/types/database";

const MAX_PRIMARY = 4;

interface Props {
  modules: readonly string[];
  role?:   UserRole;
}

export default function MobileBottomNav({ modules, role = "owner" }: Props) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const items = visibleNavItems(modules, role);
  const primaryCandidates = items.filter((i) => i.mobile === "primary");
  const primary = primaryCandidates.slice(0, MAX_PRIMARY);
  const more = [...primaryCandidates.slice(MAX_PRIMARY), ...items.filter((i) => i.mobile === "more")];

  const isActive = (href: string) => isNavActive(pathname, href);
  const isMoreActive = more.some((l) => isActive(l.href));

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-card border-t shadow-2xl">
        <div className="flex items-stretch h-16">
          {primary.map(({ href, label, icon: Icon }) => (
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
          {more.length > 0 && (
            <button
              onClick={() => setMoreOpen(true)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                isMoreActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <MoreHorizontalIcon className="size-5" />
              Más
            </button>
          )}
        </div>
      </nav>

      {/* Sheet de "Más" */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="h-auto rounded-t-2xl pb-safe">
          <div className="pt-2 pb-4">
            <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-5" />
            <div className="grid grid-cols-3 gap-2 px-2">
              {more.map(({ href, label, icon: Icon }) => (
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
