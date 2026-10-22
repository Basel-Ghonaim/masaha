import { gazaClockOf, gazaInstant, type DomainErrorCode } from '@masaha/shared/core';
import type {
  LiveStatus,
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
import {
  isFull,
  liveStatus,
  openRangeAt,
  overrideInUse,
  type LiveStatusInput,
  type Override,
  type Week,
} from './liveStatus.ts';
import { createOccupancyRepository } from './occupancy.repository.ts';
import { overrideUntil } from './overrideUntil.ts';
import { createPresent, type Present } from './present.ts';

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
 * and set by its owner; who is present, by the one definition of *present* (`present.ts`); and the
 * live status (docs/architecture/data-model.md › Live status).
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
  const present = createPresent({ visits, subscriptions });

  /** Who is present at the space, the earliest checked in first, then visits, then by id. */
  async function peopleIn(spaceId: number): Promise<PresentPerson[]> {
    const { visits: openVisits, checkIns: openCheckIns } = await present.presentIn(spaceId);
    const customerIds = [
      ...openCheckIns.map(({ customerId }) => customerId),
      ...openVisits.flatMap(({ customerId }) => (customerId === null ? [] : [customerId])),
    ];
    const [names, charges] = await Promise.all([
      customers.namesOf(spaceId, [...new Set(customerIds)]),
      visits.chargesNow(
        spaceId,
        openVisits.map(({ id }) => id),
      ),
    ]);
    const people: PresentPerson[] = [
      ...openVisits.map(({ id, visitorName, customerId, checkedInAt }) => ({
        kind: 'VISIT' as const,
        id,
        name: visitorName ?? (customerId === null ? '' : (names.get(customerId) ?? '')),
        since: checkedInAt.toISOString(),
        chargeNowAgorot: charges.get(id) ?? null,
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
   * link ended meanwhile still decides (finding 43). Answers those links.
   */
  async function lockForOverride(actor: Actor, space: LoadedSpace, tx: Tx) {
    if (!(await spaces.lock(space.id, tx))) {
      throw AppError.notFound(undefined, 'Space not found');
    }
    const links = await space.linksUnder(tx);
    if (!can(actor, 'space.liveStatus.override', { links })) {
      throw AppError.forbidden();
    }
    return links;
  }

  const service = {
    /**
     * The live status of each of these spaces now, set-based: one query each for their rows, their
     * open visits and their open check-ins (*present*), their closures, and the weeks not given. For
     * the directory, with no N+1.
     */
    async liveStatusFor(
      targets: readonly { id: number; verified: boolean; week?: Week }[],
    ): Promise<Map<number, LiveStatus | null>> {
      if (targets.length === 0) return new Map();
      const now = clock();
      const ids = targets.map(({ id }) => id);
      const withoutWeek = targets.filter(({ week }) => week === undefined).map(({ id }) => id);
      const [states, presentCounts, closed, weeks] = await Promise.all([
        occupancy.statesFor(ids),
        present.presentCountsIn(ids),
        announcements.closedAt(ids, now),
        withoutWeek.length === 0 ? new Map<number, Week>() : spaces.weeksFor(withoutWeek),
      ]);
      const at = gazaClockOf(now);
      return new Map(
        targets.map(({ id, verified, week }) => {
          const state = states.get(id);
          return [
            id,
            liveStatus({
              verified,
              closureNow: closed.has(id),
              week: week === undefined ? (weeks.get(id) ?? null) : week,
              at,
              now,
              override: state?.override ?? null,
              capacity: state?.capacity ?? null,
              present: presentCounts.get(id) ?? 0,
            }),
          ];
        }),
      );
    },

    /** Which of these verified spaces are `AVAILABLE` now: the directory's filter, resolved to ids. */
    async availableAmong(verifiedIds: readonly number[]): Promise<number[]> {
      const statuses = await service.liveStatusFor(
        verifiedIds.map((id) => ({ id, verified: true })),
      );
      return verifiedIds.filter((id) => statuses.get(id) === 'AVAILABLE');
    },

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
      const input: LiveStatusInput = {
        verified: isVerified(space),
        closureNow: closed.has(space.id),
        week,
        at: gazaClockOf(now),
        now,
        override: state.override,
        capacity: state.capacity,
        present: people.length,
      };
      // The override is answered only while the rule uses it: a closure hides it.
      const override = overrideInUse(input);
      return {
        status: liveStatus(input),
        capacity: state.capacity,
        present: people.length,
        override: override && { state: override.state, until: override.until.toISOString() },
        people,
      };
    },

    /**
     * Sets the manual override, in one transaction: the space's lock and `can()`; then, only while
     * the rule would use it (the space verified, under no closure, open by its hours), the override
     * until `min(now + duration, today's closing)`, replacing the one in force, audited with both.
     * Answers the state now.
     */
    async setOverride(
      actor: Actor,
      space: LoadedSpace,
      { state, duration }: SetStatusOverrideRequest,
    ): Promise<SpaceOccupancyNow> {
      await runInTransaction(async (tx) => {
        const links = await lockForOverride(actor, space, tx);
        const now = clock();
        const at = gazaClockOf(now);
        const open = openRangeAt(await spaces.weekOf(space.id, tx), at);
        const closed = await announcements.closedAt([space.id], now, tx);
        if (!open || closed.has(space.id) || !isVerified({ links })) {
          throw AppError.conflict('SPACE_NOT_OPEN');
        }

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

    /**
     * What a check-in at the space warns of now, in the caller's transaction, never refusing it:
     * `SPACE_FULL` when as many are present as it seats (none without a capacity), then
     * `OUTSIDE_OPENING_HOURS` when it has hours and is not open by them.
     */
    async checkInWarnings(spaceId: number, now: Date, tx: Tx): Promise<DomainErrorCode[]> {
      const { capacity } = await occupancy.stateOf(spaceId, tx);
      const { count } = await present.presentIn(spaceId, tx);
      const week = await spaces.weekOf(spaceId, tx);
      const warnings: DomainErrorCode[] = [];
      if (isFull(count, capacity)) warnings.push('SPACE_FULL');
      if (week !== null && !openRangeAt(week, gazaClockOf(now))) {
        warnings.push('OUTSIDE_OPENING_HOURS');
      }
      return warnings;
    },

    /** Who is present at the space (`present.ts`), in the caller's transaction when given. */
    presentIn(spaceId: number, tx?: Tx): Promise<Present> {
      return present.presentIn(spaceId, tx);
    },

    /** Whether the space's customer is present, by an open check-in or an open visit. */
    isPresent(spaceId: number, customerId: number, tx?: Tx): Promise<boolean> {
      return present.isPresent(spaceId, customerId, tx);
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
