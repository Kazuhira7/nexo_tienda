export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-32 bg-muted rounded-lg" />
          <div className="h-4 w-48 bg-muted rounded" />
        </div>
        <div className="h-10 w-36 bg-muted rounded-lg" />
      </div>

      <div className="rounded-xl border bg-card">
        <div className="flex gap-6 px-4 py-3 border-b">
          {[100, 80, 80, 64, 48].map((w, i) => (
            <div key={i} className="h-4 bg-muted rounded" style={{ width: w }} />
          ))}
        </div>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-6 px-4 py-4 border-b last:border-0 items-center">
            <div className="space-y-1.5" style={{ width: 100 }}>
              <div className="h-4 w-full bg-muted rounded" />
              <div className="h-3 w-3/4 bg-muted rounded" />
            </div>
            <div className="h-4 w-20 bg-muted rounded" />
            <div className="h-4 w-20 bg-muted rounded" />
            <div className="h-6 w-10 bg-muted rounded-full" />
            <div className="flex gap-1 ml-auto">
              <div className="h-8 w-14 bg-muted rounded" />
              <div className="h-8 w-14 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
