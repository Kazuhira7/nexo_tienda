export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-56 bg-muted rounded-lg" />
        <div className="h-4 w-72 bg-muted rounded" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-5 space-y-2">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-9 w-28 bg-muted rounded" />
            <div className="h-3 w-40 bg-muted rounded" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border bg-card px-3 py-2.5 space-y-1.5">
            <div className="h-3 w-20 bg-muted rounded" />
            <div className="h-5 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex justify-between px-4 py-3 border-b last:border-0">
            <div className="space-y-1.5">
              <div className="h-4 w-40 bg-muted rounded" />
              <div className="h-3 w-24 bg-muted rounded" />
            </div>
            <div className="h-5 w-20 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
