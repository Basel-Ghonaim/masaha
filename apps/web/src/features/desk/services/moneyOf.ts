/**
 * The line under the money block (S7), from the server's due and the amount received, in agorot: what
 * is recorded, the change handed back, what stays owed, and the credit a usage-based subscription
 * (`open`) keeps. A visit or a fixed price never records more than its due; it never computes a charge.
 */
export function moneyOf(
  due: number,
  received: number,
  open: boolean,
): { recorded: number; change: number; left: number; credit: number } {
  const left = Math.max(0, due - received);
  if (open) {
    return { recorded: received, change: 0, left, credit: Math.max(0, received - due) };
  }
  return {
    recorded: Math.min(received, due),
    change: Math.max(0, received - due),
    left,
    credit: 0,
  };
}
