export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-40 bg-muted rounded-lg" />
        <div className="h-4 w-64 bg-muted rounded" />
      </div>

      {/* Form card */}
      <div className="rounded-xl border bg-card p-6 space-y-5">
        <div className="h-5 w-36 bg-muted rounded" />
        <div className="grid grid-cols-2 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-28 bg-muted rounded" />
              <div className="h-10 w-full bg-muted rounded-lg" />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <div className="h-4 w-24 bg-muted rounded" />
          <div className="h-20 w-full bg-muted rounded-lg" />
        </div>
        <div className="h-10 w-36 bg-muted rounded-lg" />
      </div>

      {/* History */}
      <div className="rounded-xl border bg-card">
        <div className="p-4 border-b">
          <div className="h-5 w-36 bg-muted rounded" />
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex justify-between px-4 py-3.5 border-b last:border-0">
            <div className="space-y-1.5">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-3 w-32 bg-muted rounded" />
            </div>
            <div className="h-5 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
