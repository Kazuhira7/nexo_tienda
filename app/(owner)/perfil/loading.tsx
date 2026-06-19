export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse max-w-lg">
      <div className="space-y-2">
        <div className="h-8 w-24 bg-muted rounded-lg" />
        <div className="h-4 w-48 bg-muted rounded" />
      </div>

      {[0, 1].map((card) => (
        <div key={card} className="rounded-xl border bg-card p-6 space-y-4">
          <div className="h-5 w-32 bg-muted rounded" />
          {[0, 1].map((field) => (
            <div key={field} className="space-y-2">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-10 w-full bg-muted rounded-lg" />
            </div>
          ))}
          <div className="h-10 w-28 bg-muted rounded-lg" />
        </div>
      ))}
    </div>
  );
}
