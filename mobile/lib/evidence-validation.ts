/** Parse a required decimal without treating an empty field as a measurement. */
export function requiredDecimal(raw: string): number | null {
  const text = raw.trim().replace(",", ".");
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

export function temperatureValues(reading: string, minimum: string, maximum: string) {
  const value = requiredDecimal(reading);
  const min = requiredDecimal(minimum);
  const max = requiredDecimal(maximum);
  if (
    value === null ||
    min === null ||
    max === null ||
    value < -100 ||
    value > 300 ||
    min < -100 ||
    max > 300 ||
    min >= max
  )
    return null;
  return { value, min, max };
}
