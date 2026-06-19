export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse max-w-lg">
      <div className="space-y-2">
        <div className="h-8 w-32 bg-muted rounded-lg" />
        <div className="h-4 w-52 bg-muted rounded" />
      </div>

      <div className="rounded-xl border bg-card p-6 space-y-5">
        <div className="h-5 w-36 bg-muted rounded" />
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center justify-between py-2">
            <div className="space-y-1">
              <div className="h-4 w-28 bg-muted rounded" />
              <div className="h-3 w-40 bg-muted rounded" />
            </div>
            <div className="h-6 w-11 bg-muted rounded-full" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="h-5 w-28 bg-muted rounded" />
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
