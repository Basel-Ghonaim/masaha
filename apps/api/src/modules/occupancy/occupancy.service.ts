import { gazaClockOf, gazaInstant } from '@masaha/shared/core';
import type {
  PresentPerson,
  SetCapacityRequest,
  SetStatusOverrideRequest,
  SpaceCapacity,
  SpaceOccupancyNow,
} from '@masaha/shared/occupancy';

import type { RunInTransaction, Tx } from '../../db/index.ts';
import type { AuditWriter } from '../../shared/audit/index.ts';
import { can, isVerified, type Actor, type LoadedSpace } from '../../shared/auth/index.ts';
import { AppError } from '../../shared/errors/index.ts';
import type { AnnouncementsService } from '../announcements/index.ts';
import type { CustomersService } from '../customers/index.ts';
import type { SpacesService } from '../spaces/index.ts';
import type { SubscriptionsService } from '../subscriptions/index.ts';
import type { VisitsService } from '../visits/index.ts';
import { liveStatus, openRangeAt, type Override } from './liveStatus.ts';
import { createOccupancyRepository } from './occupancy.repository.ts';
import { overrideUntil } from './overrideUntil.ts';

interface Dependencies {
  runInTransaction: RunInTransaction;
  audit: AuditWriter;
  spaces: SpacesService;
  visits: VisitsService;
  subscriptions: SubscriptionsService;
  customers: CustomersService;
  announcements: AnnouncementsService;
  /** The one clock (conventions §11). */
  now: () => Date;
}

/** The kinds of stay in the order a tie on the check-in time lists them. */
const KIND_ORDER = { VISIT: 0, CHECK_IN: 1 } as const;

/** An override as its audit entry records it. */
const audited = ({ state, until }: Override) => ({ state, until: until.toISOString() });

/**
 * A space's state now (docs/backend/conventions.md › occupancy): its capacity, private to its staff
 * and set by its owner; who is present, the one definition of *present* (open visits plus open
 * subscription check-ins); and the live status (docs/architecture/data-model.md › Live status).
 * A read is several statements with no lock: a check-in committed between two of them can make one
 * answer lag one stay, which the next read fixes.
 */
export function createOccupancyService({
  runInTransaction,
  audit,
  spaces,
  visits,
  subscriptions,
  customers,
  announcements,
  now: clock,
}: Dependencies) {
  const occupancy = createOccupancyRepository();

  /** Who is present at the space, the earliest checked in first, then visits, then by id. */
  async function peopleIn(spaceId: number): Promise<PresentPerson[]> {
    const [openVisits, openCheckIns] = await Promise.all([
      visits.openIn(spaceId),
      subscriptions.openCheckInsIn(spaceId),
    ]);
    const customerIds = [
      ...openCheckIns.map(({ customerId }) => customerId),
      ...openVisits.flatMap(({ customerId }) => (customerId === null ? [] : [customerId])),
    ];
    const names = await customers.namesOf(spaceId, [...new Set(customerIds)]);
    const people: PresentPerson[] = [
      ...openVisits.map(({ id, visitorName, customerId, checkedInAt }) => ({
        kind: 'VISIT' as const,
        id,
        name: visitorName ?? (customerId === null ? '' : (names.get(customerId) ?? '')),
        since: checkedInAt.toISOString(),
      })),
      ...openCheckIns.map(({ id, customerId, checkedInAt }) => ({
        kind: 'CHECK_IN' as const,
        id,
        customerId,
        name: names.get(customerId) ?? '',
        since: checkedInAt.toISOString(),
      })),
    ];
    return people.sort(
      (a, b) =>
        Date.parse(a.since) - Date.parse(b.since) ||
        KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
        a.id - b.id,
    );
  }

  /** The override stored for the space, when it is still in force at `now`. */
  async function overrideInForce(spaceId: number, now: Date, tx?: Tx): Promise<Override | null> {
    const { override } = await occupancy.stateOf(spaceId, tx);
    return override && override.until > now ? override : null;
  }

  /**
   * Opens a write on the override: the space's lock, then `can()` on the links read under it, so a
   * link ended meanwhile still decides (finding 43).
   */
  async function lockForOverride(actor: Actor, space: LoadedSpace, tx: Tx): Promise<void> {
    if (!(await spaces.lock(space.id, tx))) {
      throw AppError.notFound(undefined, 'Space not found');
    }
    if (!can(actor, 'space.liveStatus.override', { links: await space.linksUnder(tx) })) {
      throw AppError.forbidden();
    }
  }

  const service = {
    /**
     * The space's state now, as its staff see it, whole: the live status, the capacity, how many
     * are present and who, and the override in force.
     */
    async now(space: LoadedSpace): Promise<SpaceOccupancyNow> {
      const now = clock();
      const [state, people, closed, week] = await Promise.all([
        occupancy.stateOf(space.id),
        peopleIn(space.id),
        announcements.closedAt([space.id], now),
        spaces.weekOf(space.id),
      ]);
      const override = state.override && state.override.until > now ? state.override : null;
      return {
        status: liveStatus({
          verified: isVerified(space),
          closureNow: closed.has(space.id),
          week,
          at: gazaClockOf(now),
          now,
          override,
          capacity: state.capacity,
          present: people.length,
        }),
        capacity: state.capacity,
        present: people.length,
        override: override && { state: override.state, until: override.until.toISOString() },
        people,
      };
    },

    /**
     * Sets the manual override, in one transaction: the space's lock and `can()`; then, only while
     * the space is open by its hours, the override until `min(now + duration, today's closing)`,
     * replacing the one in force, audited with both. Answers the state now.
     */
    async setOverride(
      actor: Actor,
      space: LoadedSpace,
      { state, duration }: SetStatusOverrideRequest,
    ): Promise<SpaceOccupancyNow> {
      await runInTransaction(async (tx) => {
        await lockForOverride(actor, space, tx);
        const now = clock();
        const at = gazaClockOf(now);
        const open = openRangeAt(await spaces.weekOf(space.id, tx), at);
        if (!open) throw AppError.conflict('SPACE_NOT_OPEN');

        const until = overrideUntil(duration, now, gazaInstant(at.date, open.closesMinute));
        const before = await overrideInForce(space.id, now, tx);
        await occupancy.setOverride(space.id, { state, until, byId: actor.id }, tx);
        await audit(
          {
            actorId: actor.id,
            action: 'space.statusOverridden',
            entityType: 'space',
            entityId: space.id,
            spaceId: space.id,
            before: before ? audited(before) : undefined,
            after: audited({ state, until }),
          },
          tx,
        );
      });
      return service.now(space);
    },

    /**
     * Clears the override in force, in one transaction under the space's lock, audited; with none in
     * force it writes nothing. Answers the state now.
     */
    async clearOverride(actor: Actor, space: LoadedSpace): Promise<SpaceOccupancyNow> {
      await runInTransaction(async (tx) => {
        await lockForOverride(actor, space, tx);
        const before = await overrideInForce(space.id, clock(), tx);
        if (!before) return;

        await occupancy.clearOverride(space.id, tx);
        await audit(
          {
            actorId: actor.id,
            action: 'space.statusOverrideCleared',
            entityType: 'space',
            entityId: space.id,
            spaceId: space.id,
            before: audited(before),
          },
          tx,
        );
      });
      return service.now(space);
    },

    /** The space's capacity; `null` before one is set. */
    async capacity(spaceId: number): Promise<SpaceCapacity> {
      return { capacity: await occupancy.capacityOf(spaceId) };
    },

    /**
     * Sets the space's capacity, in one transaction and in this order: the space's lock; `can()` on
     * the links read under it, so a link ended meanwhile still decides (finding 43); the capacity,
     * the row created on its first write; its audit entry. The capacity it already has writes and
     * audits nothing.
     */
    setCapacity(
      actor: Actor,
      space: LoadedSpace,
      { capacity }: SetCapacityRequest,
    ): Promise<SpaceCapacity> {
      return runInTransaction(async (tx) => {
        if (!(await spaces.lock(space.id, tx))) {
          throw AppError.notFound(undefined, 'Space not found');
        }
        if (!can(actor, 'space.capacity.manage', { links: await space.linksUnder(tx) })) {
          throw AppError.forbidden();
        }
        const current = await occupancy.capacityOf(space.id, tx);
        if (current === capacity) return { capacity };

        await occupancy.setCapacity(space.id, capacity, tx);
        await audit(
          {
            actorId: actor.id,
            action: 'space.capacityEdited',
            entityType: 'space',
            entityId: space.id,
            spaceId: space.id,
            before: { capacity: current },
            after: { capacity },
          },
          tx,
        );
        return { capacity };
      });
    },
  };
  return service;
}

export type OccupancyService = ReturnType<typeof createOccupancyService>;
