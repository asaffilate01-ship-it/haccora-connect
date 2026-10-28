/** Country operational days, independent of the viewer/device timezone. */
export type OperationalZone = "Europe/London" | "Europe/Berlin";

function partsAt(date: Date, timeZone: OperationalZone) {
  if (!Number.isFinite(date.getTime())) throw new RangeError("Invalid operational date");
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
}

export function operationalDate(date: Date, timeZone: OperationalZone, offsetDays = 0): string {
  if (!Number.isInteger(offsetDays)) throw new RangeError("Day offset must be an integer");
  const p = partsAt(date, timeZone);
  return new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day) + offsetDays))
    .toISOString()
    .slice(0, 10);
}

function midnightUTC(day: string, timeZone: OperationalZone): string {
  const midnight = Date.parse(`${day}T00:00:00Z`);
  let instant = midnight;
  // Midnight exists once in both supported zones. Re-evaluate the offset after
  // moving the UTC instant: the preceding day may have a different DST offset.
  for (let i = 0; i < 3; i++) {
    const p = partsAt(new Date(instant), timeZone);
    const local = Date.UTC(
      Number(p.year),
      Number(p.month) - 1,
      Number(p.day),
      Number(p.hour),
      Number(p.minute),
      Number(p.second),
    );
    const next = midnight - (local - instant);
    if (next === instant) break;
    instant = next;
  }
  return new Date(instant).toISOString();
}

export function operationalDay(date: Date, timeZone: OperationalZone) {
  const day = operationalDate(date, timeZone);
  return {
    date: day,
    start: midnightUTC(day, timeZone),
    // Never add 24 hours: the clock-change days last 23 or 25 hours.
    end: midnightUTC(operationalDate(date, timeZone, 1), timeZone),
  };
}
