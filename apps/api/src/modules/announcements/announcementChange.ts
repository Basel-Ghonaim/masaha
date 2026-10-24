import type { EditAnnouncementRequest } from '@masaha/shared/announcements';

import type { AuditValues } from '../../shared/audit/index.ts';
import type { AnnouncementData, AnnouncementRow } from './announcements.repository.ts';

/** What an edit changes, and what its audit entry records of it. */
export interface AnnouncementChange {
  /** Only the fields set to a new value. */
  data: AnnouncementData;
  /** Those fields, as they were; instants in ISO form. */
  before: AuditValues;
  /** Those fields, as they become. */
  after: AuditValues;
}

type Current = Pick<AnnouncementRow, 'type' | 'textAr' | 'textEn' | 'startsAt' | 'endsAt'>;

const TEXTS = ['type', 'textAr', 'textEn'] as const;
const INSTANTS = ['startsAt', 'endsAt'] as const;

const toDate = (value: string | null) => (value === null ? null : new Date(value));
const iso = (value: Date | null) => value?.toISOString() ?? null;

/**
 * What an edit changes: a field the edit sets to a value other than the current one, an instant
 * compared as an instant whatever its offset. An absent field is kept; `null` clears the English
 * text and the end. An edit that changes nothing has empty `data`.
 */
export function announcementChange(
  current: Current,
  edit: EditAnnouncementRequest,
): AnnouncementChange {
  const data: Record<string, unknown> = {};
  const before: Record<string, string | null> = {};
  const after: Record<string, string | null> = {};

  for (const field of TEXTS) {
    const value = edit[field];
    if (value === undefined || value === current[field]) continue;
    data[field] = value;
    before[field] = current[field];
    after[field] = value;
  }
  for (const field of INSTANTS) {
    const value = edit[field];
    if (value === undefined) continue;
    const next = toDate(value);
    if ((next?.getTime() ?? null) === (current[field]?.getTime() ?? null)) continue;
    data[field] = next;
    before[field] = iso(current[field]);
    after[field] = iso(next);
  }
  return { data, before, after };
}
