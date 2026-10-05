import { isolated } from './isolated';

/** A wait in whole seconds as a clock, minutes and seconds (`1:05`), isolated left to right. */
export function clock(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = String(seconds % 60).padStart(2, '0');
  return isolated(`${String(minutes)}:${rest}`);
}
