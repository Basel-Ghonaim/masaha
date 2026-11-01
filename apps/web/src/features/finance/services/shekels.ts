/** An amount in agorot as a CSV writes it: shekels with two decimals and a dot, no symbol. */
export function shekelsText(agorot: number): string {
  return (agorot / 100).toFixed(2);
}
