import AuthHero from "@/components/auth/auth-hero";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Brand panel: top hero on phones, left half on desktop */}
      <div className="lg:w-[56%] shrink-0">
        <AuthHero />
      </div>

      {/* Form: rises over the hero as a sheet on phones */}
      <div className="relative z-10 -mt-8 lg:mt-0 flex-1 flex flex-col rounded-t-[28px] lg:rounded-none bg-background
                      shadow-[0_-12px_40px_-12px_rgba(11,30,102,0.35)] lg:shadow-none">
        <div className="flex-1 flex items-center justify-center px-6 py-10 lg:py-12">
          <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
            {children}
          </div>
        </div>
        <footer className="pb-6 text-center text-xs text-muted-foreground">
          <span className="font-heading font-bold text-foreground/80">nexo</span>
          <span className="mx-1.5">·</span>
          Desarrollado por <span className="font-medium text-foreground/80">AG Systems</span>
        </footer>
      </div>
    </main>
  );
}
