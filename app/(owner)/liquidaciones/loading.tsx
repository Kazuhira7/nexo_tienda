export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-40 bg-muted rounded-lg" />
        <div className="h-4 w-56 bg-muted rounded" />
      </div>

      {/* Period selector */}
      <div className="flex gap-2">
        <div className="h-9 w-32 bg-muted rounded-lg" />
        <div className="h-9 w-32 bg-muted rounded-lg" />
      </div>

      {/* Brand cards */}
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <div className="h-5 w-36 bg-muted rounded" />
                <div className="h-3 w-24 bg-muted rounded" />
              </div>
              <div className="h-8 w-24 bg-muted rounded-lg" />
            </div>
            <div className="grid grid-cols-3 gap-4 pt-1 border-t">
              {[0, 1, 2].map((j) => (
                <div key={j} className="space-y-1">
                  <div className="h-3 w-20 bg-muted rounded" />
                  <div className="h-5 w-16 bg-muted rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
