/** UK calendar-day ranges shared by the browser and inspection export. */
const DAY_MS = 86_400_000;
const clock = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function localParts(date: Date) {
  return Object.fromEntries(
    clock.formatToParts(date).map((part) => [part.type, part.value]),
  );
}

export function inspectionDate(date: Date, offsetDays = 0): string {
  const p = localParts(date);
  const utc = Date.parse(`${p.year}-${p.month}-${p.day}T00:00:00Z`);
  return new Date(utc + offsetDays * DAY_MS).toISOString().slice(0, 10);
}

function parseDay(value: unknown): number {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new RangeError("Invalid inspection date");
  }
  const time = Date.parse(`${value}T00:00:00Z`);
  if (
    !Number.isFinite(time) ||
    new Date(time).toISOString().slice(0, 10) !== value
  ) {
    throw new RangeError("Invalid inspection date");
  }
  return time;
}

function ukMidnight(day: number): string {
  let instant = day;
  for (let i = 0; i < 3; i++) {
    const p = localParts(new Date(instant));
    const wall = Date.parse(
      `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`,
    );
    const next = day - (wall - instant);
    if (next === instant) break;
    instant = next;
  }
  return new Date(instant).toISOString();
}

export function inspectionPeriod(from: unknown, to: unknown) {
  const first = parseDay(from);
  const last = parseDay(to);
  const days = (last - first) / DAY_MS + 1;
  if (days < 1 || days > 366) {
    throw new RangeError("Choose a period of 1 to 366 calendar days");
  }
  return {
    start: ukMidnight(first),
    endExclusive: ukMidnight(last + DAY_MS),
    from: new Date(first).toISOString().slice(0, 10),
    to: new Date(last).toISOString().slice(0, 10),
    days,
  };
}
