import { createClient } from "@/lib/supabase/server";
import POS from "@/components/pos/pos";

export default async function NuevaVentaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, phone")
    .order("name");

  return (
    <POS
      soldBy={user!.id}
      customers={customers ?? []}
    />
  );
}
