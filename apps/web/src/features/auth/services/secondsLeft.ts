/** The whole seconds left, now, of a window of `seconds` that began at `since` (epoch ms). */
export function secondsLeft(seconds: number, since: number): number {
  return Math.max(0, Math.ceil((since + seconds * 1000 - Date.now()) / 1000));
}
