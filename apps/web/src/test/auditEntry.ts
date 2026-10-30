import type { AuditActor, AuditEntry, AuditMeta, PlatformAuditEntry } from '@masaha/shared/audit';
import type { FakeAnswer } from './fakeAdapter';

/**
 * An entry of a space's log: Huda Saleh recorded a cash payment of ₪40 at 12:05 on 21 October 2026
 * in Gaza (09:05 UTC).
 */
export function auditEntry(change: Partial<AuditEntry> = {}): AuditEntry {
  return {
    id: 501,
    at: '2026-10-21T09:05:00.000Z',
    action: 'payment.recorded',
    actor: { kind: 'PERSON', id: 9, name: 'Huda Saleh' },
    target: { type: 'payment', id: 77, name: null, nameAr: null, deleted: false },
    before: null,
    after: { visitId: 3, amountAgorot: 4000, method: 'CASH' },
    ...change,
  };
}

/** An entry of the platform's log: `auditEntry()`'s, of no space unless `space` names one. */
export function platformEntry(change: Partial<PlatformAuditEntry> = {}): PlatformAuditEntry {
  return { ...auditEntry(), space: null, ...change };
}

/** A page of a log's entries, 20 a page, with the period's actors (by default, its entries'). */
export function auditPage(entries: AuditEntry[], meta: Partial<AuditMeta> = {}): FakeAnswer {
  const actors: AuditActor[] = [];
  for (const { actor } of entries) {
    if (!actors.some((each) => JSON.stringify(each) === JSON.stringify(actor))) actors.push(actor);
  }
  return {
    status: 200,
    data: {
      success: true,
      data: entries,
      meta: {
        currentPage: 1,
        limit: 20,
        totalRecords: entries.length,
        totalPages: entries.length === 0 ? 0 : 1,
        hasNextPage: false,
        hasPreviousPage: false,
        actors,
        ...meta,
      },
    },
  };
}
