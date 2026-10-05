"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Table = "orders" | "order_items" | "dining_tables";

// Re-renders the current server page when another device changes orders/tables
// (Supabase Realtime, filtered by org; RLS still applies to what each user sees).
export default function RealtimeRefresh({ orgId, tables }: { orgId: string; tables: Table[] }) {
  const router = useRouter();
  const key = tables.join(",");

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 300); // coalesce bursts
    };

    const channel = supabase.channel(`rt-${orgId}-${key}`);
    for (const table of key.split(",")) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `organization_id=eq.${orgId}` },
        refresh
      );
    }
    channel.subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [orgId, key, router]);

  return null;
}
