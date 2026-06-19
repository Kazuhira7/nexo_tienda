export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse max-w-lg">
      <div className="space-y-2">
        <div className="h-8 w-36 bg-muted rounded-lg" />
        <div className="h-4 w-56 bg-muted rounded" />
      </div>

      <div className="rounded-xl border bg-card p-6 space-y-5">
        <div className="h-5 w-40 bg-muted rounded" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-28 bg-muted rounded" />
            <div className="h-10 w-full bg-muted rounded-lg" />
          </div>
        ))}
        <div className="h-10 w-28 bg-muted rounded-lg" />
      </div>
    </div>
  );
}
