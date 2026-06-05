export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex">
      {/* Panel izquierdo — decorativo (oculto en móvil) */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-between p-12 text-primary-foreground relative overflow-hidden">
        {/* Círculos decorativos */}
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute top-1/3 -right-16 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 left-1/4 w-96 h-96 rounded-full bg-white/5" />

        <div className="relative z-10">
          <p className="text-3xl font-heading font-bold tracking-tight">nexo</p>
          <p className="text-primary-foreground/60 text-sm mt-1">by Nexo</p>
        </div>

        <div className="relative z-10 space-y-4">
          <h2 className="text-3xl font-heading font-bold leading-snug">
            Gestión de tienda colectiva, sin complicaciones.
          </h2>
          <p className="text-primary-foreground/70 text-base leading-relaxed">
            Inventario, ventas, reportes y liquidaciones en un solo lugar.
            Diseñado para emprendedoras que prefieren vender más y administrar menos.
          </p>
        </div>

        <div className="relative z-10 flex gap-6 text-sm text-primary-foreground/60">
          <span>18 marcas</span>
          <span>·</span>
          <span>Reportes quincenales</span>
          <span>·</span>
          <span>Tiempo real</span>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex items-center justify-center bg-background px-6 py-12">
        {children}
      </div>
    </main>
  );
}
