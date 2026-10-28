import type { AuditValue, AuditValues } from '../../shared/audit/index.ts';

/** What a card's save changes: only its fields set to a new value, as they were and become. */
export interface SettingsChange {
  before: AuditValues;
  after: AuditValues;
}

/**
 * What a save of a card changes: each field whose value differs from the current one. A save that
 * changes nothing answers `null`, and writes and audits nothing.
 */
export function settingsChange<Card extends object>(
  current: Card,
  next: Card,
): SettingsChange | null {
  const was = current as Record<string, AuditValue>;
  const becomes = next as Record<string, AuditValue>;
  const changed = Object.keys(becomes).filter((field) => becomes[field] !== was[field]);
  if (changed.length === 0) return null;
  const pick = (from: Record<string, AuditValue>): AuditValues =>
    Object.fromEntries(changed.map((field) => [field, from[field] ?? null]));
  return { before: pick(was), after: pick(becomes) };
}
