/** A stay in whole minutes as hours and minutes: 252 → «4:12». */
export function stayText(minutes: number): string {
  return `${String(Math.floor(minutes / 60))}:${String(minutes % 60).padStart(2, '0')}`;
}
