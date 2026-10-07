import type { AdminSpace, CreateSpaceRequest } from '@masaha/shared/spaces';

import type { RunInTransaction } from '../../../db/index.ts';
import type { AuditValues, AuditWriter } from '../../../shared/audit/index.ts';
import { isVerified, type LoadedSpace } from '../../../shared/auth/index.ts';
import { AppError } from '../../../shared/errors/index.ts';
import type { LookupsService } from '../../lookups/index.ts';
import type { PlatformSettingsService } from '../../platform-settings/index.ts';
import type { SpaceSettingsService } from '../../space-settings/index.ts';
import { createFactsReader, NO_FACTS } from '../facts/facts.ts';
import { profileValues, toProfileData } from '../profile.ts';
import { nextSlug, slugBase } from '../slug.ts';
import { createSpaceRepository, type LockedSpace, type SpaceData } from './space.repository.ts';
import { createSpaceView } from './spaceView.ts';

interface Dependencies {
  runInTransaction: RunInTransaction;
  audit: AuditWriter;
  lookups: LookupsService;
  platformSettings: PlatformSettingsService;
  spaceSettings: SpaceSettingsService;
  /** The one clock (conventions §11): staleness is measured from it. */
  now: () => Date;
}

// Two creations that derive the same slug at once: the later one finds it taken when it writes,
// rolls back, and starts again with the slugs as they are then.
const CREATE_ATTEMPTS = 3;

/** Thrown inside a creation's transaction to roll it back when its slug was taken meanwhile. */
class SlugTaken extends Error {}

/** A change of a space's visibility or existence: its data and its audit entry. */
interface Toggle {
  action: string;
  data: SpaceData;
  before: AuditValues;
  after: AuditValues;
}

/**
 * The spaces the admin keeps: created unverified, with their settings; read with whether an owner
 * has joined; hidden and shown again, soft-deleted and restored, verified or not.
 */
export function createSpaceService({
  runInTransaction,
  audit,
  lookups,
  platformSettings,
  spaceSettings,
  now,
}: Dependencies) {
  const repository = createSpaceRepository();
  const view = createSpaceView(now);
  const readFacts = createFactsReader();

  /**
   * Applies the change `toggle` decides for the space as it is, under its lock, with its audit
   * entry; a change to what the space already is writes nothing. An unknown space is 404, and so is
   * a soft-deleted one, unless `toggle` reaches deleted spaces (`reachDeleted`).
   */
  function change(
    actorId: number,
    spaceId: number,
    toggle: (space: LockedSpace) => Toggle | null,
    { reachDeleted = false } = {},
  ): Promise<void> {
    return runInTransaction(async (tx) => {
      const space = await repository.lock(spaceId, tx);
      if (!space || (space.deletedAt && !reachDeleted)) {
        throw AppError.notFound(undefined, 'Space not found');
      }
      const decided = toggle(space);
      if (!decided) return;
      await repository.update(spaceId, decided.data, tx);
      const { action, before, after } = decided;
      await audit(
        { actorId, action, entityType: 'space', entityId: spaceId, spaceId, before, after },
        tx,
      );
    });
  }

  return {
    /**
     * The space with its facts, and whether it is verified, from its links; 404 once it is
     * soft-deleted.
     */
    async get(space: LoadedSpace): Promise<AdminSpace> {
      const [thresholds, found, facts] = await Promise.all([
        platformSettings.stalenessThresholds(),
        repository.findLive(space.id),
        readFacts(space.id),
      ]);
      if (!found) throw AppError.notFound(undefined, 'Space not found');
      return view(found, isVerified(space), thresholds, facts);
    },

    /** Hides the space from the public, or shows it again. */
    setHidden(actorId: number, spaceId: number, isHidden: boolean): Promise<void> {
      return change(actorId, spaceId, (space) =>
        space.isHidden === isHidden
          ? null
          : {
              action: isHidden ? 'space.hidden' : 'space.unhidden',
              data: { isHidden },
              before: { isHidden: space.isHidden },
              after: { isHidden },
            },
      );
    },

    /**
     * Soft-deletes the space (ADR 0007): it leaves every list and the public, and stays restorable.
     * Its links are kept and count for nothing meanwhile (finding 18). A repeat changes nothing.
     */
    remove(actorId: number, spaceId: number): Promise<void> {
      const at = now();
      return change(
        actorId,
        spaceId,
        (space) =>
          space.deletedAt
            ? null
            : {
                action: 'space.deleted',
                data: { deletedAt: at },
                before: { deletedAt: null },
                after: { deletedAt: at.toISOString() },
              },
        { reachDeleted: true },
      );
    },

    /** Brings a soft-deleted space back, as it was, hidden or not. A live space changes nothing. */
    restore(actorId: number, spaceId: number): Promise<void> {
      return change(
        actorId,
        spaceId,
        (space) =>
          space.deletedAt
            ? {
                action: 'space.restored',
                data: { deletedAt: null },
                before: { deletedAt: space.deletedAt.toISOString() },
                after: { deletedAt: null },
              }
            : null,
        { reachDeleted: true },
      );
    },

    /**
     * A new, unverified space, in one transaction: the space, then its settings copied from the
     * platform's new-space defaults, then its audit entry. When the defaults cannot be read, nothing
     * is written. Each write is its own statement, never a nested create (finding 11). The
     * staleness thresholds are read first, outside the transaction: an unreadable one fails before
     * anything is written, and the transaction never waits on a second connection.
     */
    async create(actorId: number, request: CreateSpaceRequest): Promise<AdminSpace> {
      const base = slugBase(request.nameEn);
      if (!base) throw AppError.validation({ nameEn: ['invalid_format'] });
      const profile = toProfileData(request);
      const thresholds = await platformSettings.stalenessThresholds();

      for (let attempt = 1; ; attempt += 1) {
        try {
          const space = await runInTransaction(async (tx) => {
            if (!(await lookups.isActiveArea(profile.areaId, tx))) {
              throw AppError.validation({ areaId: ['invalid_choice'] });
            }
            const defaults = await platformSettings.newSpaceDefaults(tx);
            const slug = nextSlug(base, await repository.takenSlugs(base, tx));
            const creation = await repository.create({ ...profile, slug }, now(), tx);
            if ('slugTaken' in creation) throw new SlugTaken();

            const { id } = creation.space;
            await spaceSettings.createFor(id, defaults, tx);
            await audit(
              {
                actorId,
                action: 'space.created',
                entityType: 'space',
                entityId: id,
                spaceId: id,
                after: { ...profileValues(profile), slug },
              },
              tx,
            );
            return creation.space;
          });
          return view(space, false, thresholds, NO_FACTS);
        } catch (error) {
          if (!(error instanceof SlugTaken)) throw error;
          if (attempt === CREATE_ATTEMPTS) {
            throw AppError.conflict(undefined, 'The slug was taken by another creation each time');
          }
        }
      }
    },
  };
}

export type SpaceService = ReturnType<typeof createSpaceService>;
