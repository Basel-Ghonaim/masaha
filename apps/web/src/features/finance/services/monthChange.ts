/**
 * How a month's income compares with the month before, as a whole percentage with its sign, in
 * Western digits: "+12%", "-8%". None when the month before had no income: no ratio of nothing.
 */
export function monthChange(current: number, previous: number): string | null {
  if (previous <= 0) return null;
  const change = Math.round(((current - previous) / previous) * 100);
  return `${change >= 0 ? '+' : '-'}${String(Math.abs(change))}%`;
}
