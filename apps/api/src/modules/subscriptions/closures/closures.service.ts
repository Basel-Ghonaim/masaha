import {
  EXTENSION_MAX_DAYS,
  type AnnouncementsQuery,
  type AnnouncementsSummary,
  type ExtensionPreview,
  type ManagedAnnouncement,
} from '@masaha/shared/announcements';

import { AppError } from '../../../shared/errors/index.ts';
import { closureSpan, type AnnouncementsService } from '../../announcements/index.ts';
import type { UsersService } from '../../users/index.ts';
import { toExtensionApplied, toManagedAnnouncement } from './closures.mapper.ts';
import { createClosuresRepository } from './closures.repository.ts';

interface Dependencies {
  announcements: AnnouncementsService;
  users: UsersService;
  /** The one clock (conventions §11). */
  now: () => Date;
}

/** How long a closure left unextended stays in the summary's count (the owner's Q6, 2026-10-21). */
const AWAITING_DAYS = 30;
const DAY_MS = 86_400_000;

/**
 * The closures as `subscriptions` sees them (docs/backend/conventions.md §9): the managed
 * announcements list, each closure with the extension of the subscriptions it covered, and the
 * summary of the list's tabs. It composes `announcements`' rows with the extensions it owns; the
 * writes stay `announcements`'.
 */
export function createClosuresService({ announcements, users, now }: Dependencies) {
  const repository = createClosuresRepository();

  return {
    /**
     * A page of the space's announcements in one state, each closure with its extension (`null`
     * until one is applied) and who applied it; and how many there are. The same few queries
     * whatever the page's size.
     */
    async page(
      spaceId: number,
      query: AnnouncementsQuery,
    ): Promise<{ rows: ManagedAnnouncement[]; total: number }> {
      const { rows, total } = await announcements.page(spaceId, query, now());
      const closureIds = rows.filter(({ type }) => type === 'CLOSURE').map(({ id }) => id);
      const extensions = await repository.extensionsOf(closureIds);
      const appliers = await users.namesFor([...new Set(extensions.map((row) => row.appliedById))]);
      const names = new Map(appliers.map(({ id, name }) => [id, name]));
      const byClosure = new Map(
        extensions.map((row) => [
          row.announcementId,
          toExtensionApplied(row, names.get(row.appliedById) ?? ''),
        ]),
      );
      return {
        rows: rows.map((row) => toManagedAnnouncement(row, byClosure.get(row.id))),
        total,
      };
    },

    /**
     * A closure's extension before it is applied, read without a lock and writing nothing: the
     * space's closure, not deleted (else `not_found`); one applied answers it, with how many it
     * moved; one not started yet → `ANNOUNCEMENT_NOT_STARTED`; else the Gaza days it covered to now,
     * the days proposed (at most `EXTENSION_MAX_DAYS`) and how many subscriptions it covered.
     */
    async preview(spaceId: number, announcementId: number): Promise<ExtensionPreview> {
      const closure = await announcements.closureIn(spaceId, announcementId);
      const at = now();
      const [extension] = await repository.extensionsOf([closure.id]);
      if (!extension && closure.startsAt.getTime() > at.getTime()) {
        throw AppError.conflict('ANNOUNCEMENT_NOT_STARTED');
      }
      const span = closureSpan(closure, at);
      const proposal = {
        firstDay: span.firstDay,
        lastDay: span.lastDay,
        proposedDays: Math.min(span.days, EXTENSION_MAX_DAYS),
      };
      if (!extension) {
        const count = await repository.coveredCount(spaceId, span);
        return { ...proposal, subscriptions: count, applied: null };
      }
      const [applier] = await users.namesFor([extension.appliedById]);
      return {
        ...proposal,
        subscriptions: extension.subscriptions,
        applied: toExtensionApplied(extension, applier?.name ?? ''),
      };
    },

    /**
     * The managed list's counts at `at`, by state, and the closures awaiting an extension: started
     * within the last 30 days, not deleted, with none applied. The owner's overview reads it too.
     */
    async summary(spaceId: number, at: Date = now()): Promise<AnnouncementsSummary> {
      const since = new Date(at.getTime() - AWAITING_DAYS * DAY_MS);
      const [counts, started] = await Promise.all([
        announcements.counts(spaceId, at),
        announcements.startedClosureIds(spaceId, at, since),
      ]);
      const extended = await repository.extendedAmong(started);
      return {
        running: counts.RUNNING,
        upcoming: counts.UPCOMING,
        ended: counts.ENDED,
        closuresAwaitingExtension: started.length - extended.size,
      };
    },
  };
}

export type ClosuresService = ReturnType<typeof createClosuresService>;
