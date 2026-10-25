import type { DeskWarning } from '@masaha/shared/desk';
import type { Catalogue } from '@shared/copy';

/** A check-in's warnings, each its catalogue line, in the server's order (S6); none without them. */
export function warningLines(
  warnings: readonly DeskWarning[] | undefined,
  errors: Catalogue['errors'],
): string[] {
  return (warnings ?? []).map((code) => errors[code]);
}
