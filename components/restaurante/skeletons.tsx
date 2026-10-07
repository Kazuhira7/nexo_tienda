// Loading skeletons (loading.tsx) so navigation shows the page shape instantly.

function Bar({ className }: { className: string }) {
  return <div className={`bg-muted rounded-lg ${className}`} />;
}

function Header() {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="space-y-2">
        <Bar className="h-7 w-40" />
        <Bar className="h-4 w-56" />
      </div>
      <Bar className="h-10 w-32" />
    </div>
  );
}

/** Grid of cards: salón, mesas. */
export function GridSkeleton({ cards = 10 }: { cards?: number }) {
  return (
    <div className="space-y-6 animate-pulse">
      <Header />
      <Bar className="h-4 w-24" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {Array.from({ length: cards }).map((_, i) => <Bar key={i} className="h-28 rounded-2xl" />)}
      </div>
    </div>
  );
}

/** Rows list: menú, equipo. */
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-6 animate-pulse max-w-4xl">
      <Header />
      <div className="rounded-xl border bg-card divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5">
            <div className="flex-1 space-y-1.5">
              <Bar className="h-4 w-1/3" />
              <Bar className="h-3 w-1/2" />
            </div>
            <Bar className="h-5 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Two columns: orden (menú + ticket), cobrar (ticket + pago). */
export function TwoColSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <Bar className="size-11 rounded-xl" />
        <div className="space-y-1.5">
          <Bar className="h-6 w-36" />
          <Bar className="h-3 w-24" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-3">
          <div className="flex gap-2">
            {[0, 1, 2, 3].map((i) => <Bar key={i} className="h-11 w-28 rounded-full" />)}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {Array.from({ length: 9 }).map((_, i) => <Bar key={i} className="h-20 rounded-xl" />)}
          </div>
        </div>
        <Bar className="h-96 rounded-2xl hidden md:block" />
      </div>
    </div>
  );
}

/** KPIs + panels: inicio, reportes. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse max-w-5xl">
      <Header />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => <Bar key={i} className="h-24 rounded-xl" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Bar className="h-64 rounded-xl" />
        <Bar className="h-64 rounded-xl" />
      </div>
    </div>
  );
}
