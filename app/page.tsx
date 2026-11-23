import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { homeRoute } from "@/lib/home-route";
import LandingPage from "@/components/landing/landing-page";
import { SALES, formatNio } from "@/lib/site";

const DESCRIPTION =
  `Vende desde el celular, controla tu inventario y cuadra la caja. Para tiendas colectivas y restaurantes en ` +
  `Nicaragua. ${formatNio(SALES.monthlyPriceNio)} al mes, ${SALES.trialDays} días gratis.`;

export const metadata: Metadata = {
  title: "nexo · Ventas, inventario y caja para tu negocio",
  description: DESCRIPTION,
  openGraph: {
    title: "nexo · Deja el cuaderno, lleva tu negocio en nexo",
    description: DESCRIPTION,
    type: "website",
    locale: "es_NI",
    siteName: "nexo",
  },
};

// Root route: authenticated users go to their role's home; visitors get the public sales page.
export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <LandingPage />;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  redirect(homeRoute(profile?.role));
}
