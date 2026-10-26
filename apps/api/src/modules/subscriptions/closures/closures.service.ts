import {
  EXTENSION_MAX_DAYS,
  type AnnouncementsQuery,
  type AnnouncementsSummary,
  type ClosureExtension,
  type ExtendSubscriptionsRequest,
  type ExtensionPreview,
  type ManagedAnnouncement,
} from '@masaha/shared/announcements';

import type { RunInTransaction } from '../../../db/index.ts';
import type { AuditWriter } from '../../../shared/audit/index.ts';
import { can, type Actor, type LoadedSpace } from '../../../shared/auth/index.ts';
import { AppError } from '../../../shared/errors/index.ts';
import { closureSpan, type AnnouncementsService } from '../../announcements/index.ts';
import type { SpacesService } from '../../spaces/index.ts';
import type { UsersService } from '../../users/index.ts';
import {
  toClosureExtension,
  toExtensionApplied,
  toManagedAnnouncement,
} from './closures.mapper.ts';
import { createClosuresRepository } from './closures.repository.ts';

interface Dependencies {
  runInTransaction: RunInTransaction;
  audit: AuditWriter;
  spaces: SpacesService;
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
 * summary of the list's tabs; a closure's extension, previewed and applied. It composes
 * `announcements`' rows with the extensions it owns; the announcements' writes stay theirs.
 */
export function createClosuresService({
  runInTransaction,
  audit,
  spaces,
  announcements,
  users,
  now,
}: Dependencies) {
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
     * Extends the subscriptions a closure covered by the days typed, once per closure, in one
     * transaction and in this order (conventions §13: the space, the closure, the subscriptions by
     * id): the space's lock; `can()` on the links read under it; the extension this key applied, for
     * a retry, answered as it was (another closure's → `conflict`); the closure, locked (else
     * `not_found`); one extended already → `CLOSURE_ALREADY_EXTENDED`; one not started yet →
     * `ANNOUNCEMENT_NOT_STARTED`; its span at now; the covered subscriptions locked, their ends moved
     * in one statement; the extension and its links; its audit entry.
     */
    extend(
      actor: Actor,
      space: LoadedSpace,
      announcementId: number,
      key: string,
      { days }: ExtendSubscriptionsRequest,
    ): Promise<ClosureExtension> {
      return runInTransaction(async (tx) => {
        if (!(await spaces.lock(space.id, tx))) {
          throw AppError.notFound(undefined, 'Space not found');
        }
        const links = await space.linksUnder(tx);
        if (!can(actor, 'subscriptions.extendAfterClosure', { links })) throw AppError.forbidden();
        const recorded = await repository.findByKey(key, tx);
        if (recorded) {
          if (recorded.announcementId !== announcementId) {
            throw AppError.conflict(undefined, 'This idempotency key extended another closure');
          }
          const [applier] = await users.namesFor([recorded.appliedById], tx);
          return toClosureExtension(recorded, applier?.name ?? '');
        }

        const closure = await announcements.lockClosure(space.id, announcementId, tx);
        if (await repository.isExtended(closure.id, tx)) {
          throw AppError.conflict('CLOSURE_ALREADY_EXTENDED');
        }
        const at = now();
        if (closure.startsAt.getTime() > at.getTime()) {
          throw AppError.conflict('ANNOUNCEMENT_NOT_STARTED');
        }
        const ids = await repository.lockCovered(space.id, closureSpan(closure, at), tx);
        await repository.moveEnds(ids, days, at, tx);
        await repository.createExtension(
          { announcementId, days, appliedById: actor.id, key, appliedAt: at },
          ids,
          tx,
        );
        await audit(
          {
            actorId: actor.id,
            action: 'closure.subscriptionsExtended',
            entityType: 'announcement',
            entityId: announcementId,
            spaceId: space.id,
            after: { days, subscriptionIds: ids },
          },
          tx,
        );
        const [applier] = await users.namesFor([actor.id], tx);
        return toClosureExtension(
          { announcementId, days, subscriptions: ids.length, appliedAt: at, appliedById: actor.id },
          applier?.name ?? '',
        );
      });
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
