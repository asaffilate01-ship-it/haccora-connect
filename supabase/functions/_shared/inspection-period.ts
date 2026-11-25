/** Pure shared date contract for the UK inspection preview and Edge Function. */
const DAY_MS = 86_400_000;
const zone = "Europe/London";

function dateParts(date: Date) {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date).map((part) => [part.type, part.value]),
  );
}

export function ukCalendarDate(date: Date, offset = 0): string {
  const p = dateParts(date);
  return new Date(
    Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day) + offset),
  ).toISOString().slice(0, 10);
}

function calendarMillis(value: unknown): number {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new RangeError("Invalid calendar date");
  }
  const ms = Date.parse(value + "T00:00:00Z");
  if (
    !Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== value
  ) {
    throw new RangeError("Invalid calendar date");
  }
  return ms;
}

function londonMidnight(ms: number): string {
  let instant = ms;
  for (let i = 0; i < 3; i++) {
    const p = dateParts(new Date(instant));
    const local = Date.UTC(
      Number(p.year),
      Number(p.month) - 1,
      Number(p.day),
      Number(p.hour),
      Number(p.minute),
      Number(p.second),
    );
    const next = ms - (local - instant);
    if (next === instant) break;
    instant = next;
  }
  return new Date(instant).toISOString();
}

/** Inclusive calendar dates, half-open UTC query interval, maximum 366 dates. */
export function ukInspectionPeriod(from: unknown, to: unknown) {
  const first = calendarMillis(from);
  const last = calendarMillis(to);
  if (last < first || last - first >= 366 * DAY_MS) {
    throw new RangeError("Invalid inspection period");
  }
  return {
    from: new Date(first).toISOString().slice(0, 10),
    to: new Date(last).toISOString().slice(0, 10),
    start: londonMidnight(first),
    end: londonMidnight(last + DAY_MS),
  };
}
