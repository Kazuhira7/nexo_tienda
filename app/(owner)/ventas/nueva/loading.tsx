export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-40 bg-muted rounded-lg" />

      {/* Buscador */}
      <div className="flex gap-2">
        <div className="h-12 flex-1 bg-muted rounded-lg" />
        <div className="h-12 w-24 bg-muted rounded-lg" />
      </div>

      {/* Carrito vacío placeholder */}
      <div className="rounded-lg border-2 border-dashed h-40 bg-muted/30" />
    </div>
  );
}
