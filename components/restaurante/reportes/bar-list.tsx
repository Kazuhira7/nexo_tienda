// Simple horizontal bars (no chart library) — works in Server Components.

export interface BarRow {
  key:    string;
  label:  string;
  value:  number;   // drives the bar length
  right:  string;   // formatted value shown at the end
  sub?:   string;   // small secondary text under the label
}

export default function BarList({ rows, empty = "Sin datos en este periodo" }: { rows: BarRow[]; empty?: string }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">{empty}</p>;
  }
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.key} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">
              {r.label}
              {r.sub && <span className="text-xs text-muted-foreground ml-1.5">{r.sub}</span>}
            </span>
            <span className="font-medium shrink-0">{r.right}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
