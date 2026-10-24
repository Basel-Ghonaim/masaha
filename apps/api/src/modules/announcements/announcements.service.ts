import type {
  Announcement,
  CreateAnnouncementRequest,
  EditAnnouncementRequest,
} from '@masaha/shared/announcements';

import type { RunInTransaction, Tx } from '../../db/index.ts';
import type { AuditWriter } from '../../shared/audit/index.ts';
import { can, type Actor, type LoadedSpace } from '../../shared/auth/index.ts';
import { AppError } from '../../shared/errors/index.ts';
import type { SpacesService } from '../spaces/index.ts';
import { announcementChange } from './announcementChange.ts';
import { toAnnouncement } from './announcements.mapper.ts';
import { createAnnouncementsRepository } from './announcements.repository.ts';
import { periodErrors } from './period.ts';

interface Dependencies {
  runInTransaction: RunInTransaction;
  audit: AuditWriter;
  spaces: SpacesService;
  /** The one clock (conventions §11). */
  now: () => Date;
}

const iso = (date: Date | null) => date?.toISOString() ?? null;

/**
 * A space's announcements (docs/backend/conventions.md §7): posted and changed by its staff, and the
 * closures the live status reads.
 */
export function createAnnouncementsService({ runInTransaction, audit, spaces, now }: Dependencies) {
  const repository = createAnnouncementsRepository();

  /**
   * Locks the space and decides whether `actor` may change its announcements, on its links as they
   * are under the lock, so a link ended meanwhile still decides (finding 43). The lock also
   * serialises the space's posts, so a retry is read first.
   */
  async function lockFor(actor: Actor, space: LoadedSpace, tx: Tx): Promise<void> {
    if (!(await spaces.lock(space.id, tx))) throw AppError.notFound(undefined, 'Space not found');
    if (!can(actor, 'announcements.manage', { links: await space.linksUnder(tx) })) {
      throw AppError.forbidden();
    }
  }

  return {
    /** Which of these spaces an active closure covers at `now`, in one query. */
    closedAt(spaceIds: readonly number[], at: Date, tx?: Tx): Promise<Set<number>> {
      return repository.closedAt(spaceIds, at, tx);
    },

    /**
     * Posts an announcement, in one transaction and in this order: the space's lock; `can()` on the
     * links read under it; the announcement this key already posted, for a retry, answered as it is
     * now; its period at now (`period.ts`), the start now when absent → `validation`; the
     * announcement, with the key; its audit entry.
     */
    create(
      actor: Actor,
      space: LoadedSpace,
      key: string,
      request: CreateAnnouncementRequest,
    ): Promise<Announcement> {
      return runInTransaction(async (tx) => {
        await lockFor(actor, space, tx);
        const recorded = await repository.findByKey(space.id, key, tx);
        if (recorded) return toAnnouncement(recorded, now());

        const at = now();
        const startsAt = request.startsAt === undefined ? at : new Date(request.startsAt);
        const endsAt = request.endsAt == null ? null : new Date(request.endsAt);
        const errors = periodErrors({ startsAt, endsAt }, at, 'create');
        if (errors) throw AppError.validation(errors);

        const created = await repository.create(
          space.id,
          {
            type: request.type,
            textAr: request.textAr,
            textEn: request.textEn ?? null,
            startsAt,
            endsAt,
            key,
          },
          tx,
        );
        await audit(
          {
            actorId: actor.id,
            action: 'announcement.created',
            entityType: 'announcement',
            entityId: created.id,
            spaceId: space.id,
            after: { type: created.type, startsAt: iso(startsAt), endsAt: iso(endsAt) },
          },
          tx,
        );
        return toAnnouncement(created, at);
      });
    },

    /**
     * Edits an announcement, in one transaction and in this order: the space's lock; `can()`; the
     * announcement's row, the space's and not deleted (else `not_found`); only the fields the edit
     * sets to a new value; the period, what changed checked against now (`period.ts`) →
     * `validation`; its audit entry with before and after. An edit that changes nothing writes and
     * audits nothing.
     */
    edit(
      actor: Actor,
      space: LoadedSpace,
      announcementId: number,
      request: EditAnnouncementRequest,
    ): Promise<Announcement> {
      return runInTransaction(async (tx) => {
        await lockFor(actor, space, tx);
        const current = await repository.lockIn(space.id, announcementId, tx);
        if (!current) throw AppError.notFound(undefined, 'Announcement not found');
        const at = now();
        const { data, before, after } = announcementChange(current, request);
        if (Object.keys(data).length === 0) return toAnnouncement(current, at);

        const errors = periodErrors(
          {
            startsAt: data.startsAt ?? current.startsAt,
            endsAt: data.endsAt === undefined ? current.endsAt : data.endsAt,
          },
          at,
          'edit',
          { startsAt: data.startsAt !== undefined, endsAt: data.endsAt !== undefined },
        );
        if (errors) throw AppError.validation(errors);

        const row = await repository.update(announcementId, data, tx);
        await audit(
          {
            actorId: actor.id,
            action: 'announcement.edited',
            entityType: 'announcement',
            entityId: announcementId,
            spaceId: space.id,
            before,
            after,
          },
          tx,
        );
        return toAnnouncement(row, at);
      });
    },
  };
}

export type AnnouncementsService = ReturnType<typeof createAnnouncementsService>;
