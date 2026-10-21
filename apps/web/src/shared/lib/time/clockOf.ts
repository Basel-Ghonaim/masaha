/** A minute of the day as `HH:MM`: `510` → `08:30`, the day's end `1440` → `24:00`. */
export function clockOf(minute: number): string {
  const hours = Math.floor(minute / 60);
  return `${String(hours).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}
