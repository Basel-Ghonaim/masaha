/**
 * A report's id as an address names it (`?report=`, `?open=`): a positive whole number, or none for
 * anything else.
 */
export function reportIdOf(text: string | null): number | undefined {
  if (text === null || !/^[1-9]\d*$/.test(text)) return undefined;
  const id = Number(text);
  return Number.isSafeInteger(id) ? id : undefined;
}
