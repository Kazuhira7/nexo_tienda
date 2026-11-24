import type { Metadata, Viewport } from "next";
import { Sora, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import ThemeProvider from "@/components/theme-provider";
import "./globals.css";
import { BRAND } from "@/lib/brand";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: BRAND.displayName,
  description: "Gestión para tu negocio: ventas, salón y caja",
  icons: { apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: BRAND.displayName, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: BRAND.colors.primary,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${sora.variable} ${jakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          {children}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
