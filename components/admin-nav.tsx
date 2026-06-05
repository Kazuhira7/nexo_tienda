"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ShieldIcon } from "lucide-react";

export default function AdminNav({ userName }: { userName: string }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-card shadow-sm">
      <div className="container max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-xl font-bold font-heading text-primary">
            nexo
          </Link>
          <div className="flex items-center gap-1.5 rounded-md bg-primary/10 text-primary px-2 py-1 text-xs font-semibold">
            <ShieldIcon className="size-3" />
            Super Admin
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:block">{userName}</span>
          <Button variant="outline" size="sm" onClick={handleLogout}>Salir</Button>
        </div>
      </div>
    </header>
  );
}
