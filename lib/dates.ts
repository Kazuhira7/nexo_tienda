// Timezone-aware day helpers — pure, safe for client and server.
// The server runs in UTC, so "today" must always be computed in the org's timezone
// (organizations.timezone, default America/Managua).

export const DEFAULT_TIMEZONE = "America/Managua";

function safeZone(timeZone: string | null | undefined): string {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timeZone ?? DEFAULT_TIMEZONE });
    return timeZone ?? DEFAULT_TIMEZONE;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

/** Calendar date (YYYY-MM-DD) of `date` as seen in `timeZone`. */
export function localDateString(timeZone?: string | null, date: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: safeZone(timeZone),
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date);
}

/** Offset (ms) of `timeZone` from UTC at instant `date` (e.g. Managua → −6 h). */
function zoneOffsetMs(timeZone: string, date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * UTC instants [start, end) covering the local calendar day `day` (YYYY-MM-DD) in `timeZone`.
 * Use with `.gte("created_at", start).lt("created_at", end)`.
 */
export function localDayRange(day: string, timeZone?: string | null): { start: string; end: string } {
  const zone = safeZone(timeZone);
  const [y, m, d] = day.split("-").map(Number);
  const toUtc = (yy: number, mm: number, dd: number) => {
    const guess = new Date(Date.UTC(yy, mm - 1, dd));
    // Re-evaluate the offset at the corrected instant to handle DST boundaries
    const first = guess.getTime() - zoneOffsetMs(zone, guess);
    return new Date(guess.getTime() - zoneOffsetMs(zone, new Date(first)));
  };
  return {
    start: toUtc(y, m, d).toISOString(),
    end:   toUtc(y, m, d + 1).toISOString(),
  };
}

/** Adds `days` to a calendar date (YYYY-MM-DD → YYYY-MM-DD), timezone-free. */
export function shiftDay(day: string, days: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** True for a valid YYYY-MM-DD string. */
export function isDayString(value: string | undefined | null): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}
