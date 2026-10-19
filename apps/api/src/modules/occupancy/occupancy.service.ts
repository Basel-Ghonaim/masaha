import { gazaClockOf } from '@masaha/shared/core';
import type {
  PresentPerson,
  SetCapacityRequest,
  SpaceCapacity,
  SpaceOccupancyNow,
} from '@masaha/shared/occupancy';

import type { RunInTransaction } from '../../db/index.ts';
import type { AuditWriter } from '../../shared/audit/index.ts';
import { can, isVerified, type Actor, type LoadedSpace } from '../../shared/auth/index.ts';
import { AppError } from '../../shared/errors/index.ts';
import type { AnnouncementsService } from '../announcements/index.ts';
import type { CustomersService } from '../customers/index.ts';
import type { SpacesService } from '../spaces/index.ts';
import type { SubscriptionsService } from '../subscriptions/index.ts';
import type { VisitsService } from '../visits/index.ts';
import { liveStatus } from './liveStatus.ts';
import { createOccupancyRepository } from './occupancy.repository.ts';

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

  return {
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
}

export type OccupancyService = ReturnType<typeof createOccupancyService>;
