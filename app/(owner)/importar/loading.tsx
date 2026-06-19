export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-36 bg-muted rounded-lg" />
        <div className="h-4 w-64 bg-muted rounded" />
      </div>

      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="space-y-2">
          <div className="h-4 w-24 bg-muted rounded" />
          <div className="h-10 w-48 bg-muted rounded-lg" />
        </div>
        {/* Drop zone */}
        <div className="border-2 border-dashed rounded-xl h-40 flex items-center justify-center">
          <div className="space-y-2 text-center">
            <div className="h-8 w-8 bg-muted rounded-full mx-auto" />
            <div className="h-4 w-48 bg-muted rounded mx-auto" />
            <div className="h-3 w-32 bg-muted rounded mx-auto" />
          </div>
        </div>
        <div className="h-10 w-28 bg-muted rounded-lg" />
      </div>
    </div>
  );
}
