export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-32 bg-muted rounded-lg" />
        <div className="h-4 w-48 bg-muted rounded" />
      </div>

      <div className="rounded-xl border bg-card">
        <div className="flex gap-4 px-4 py-3 border-b">
          {[48, 64, 56, 48, 56].map((w, i) => (
            <div key={i} className="h-4 bg-muted rounded" style={{ width: w }} />
          ))}
        </div>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-4 px-4 py-3.5 border-b last:border-0 items-center">
            <div className="h-4 w-12 bg-muted rounded" />
            <div className="h-4 w-16 bg-muted rounded" />
            <div className="h-4 w-14 bg-muted rounded" />
            <div className="h-5 w-16 bg-muted rounded-full ml-auto" />
            <div className="h-4 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
