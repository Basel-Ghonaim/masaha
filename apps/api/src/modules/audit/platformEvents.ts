import { Prisma } from '../../generated/prisma/client.ts';

/**
 * The platform's events, whatever space they name: the spaces' public facts and existence, their
 * owners, the lookups and the data reports' decisions (ADR 0002: the admin keeps every space's
 * existence and moderation). The admin's log shows nothing else (default deny).
 */
export const PLATFORM_ACTIONS = [
  'space.created',
  'space.profileEdited',
  'space.hoursEdited',
  'space.pricesEdited',
  'space.amenitiesEdited',
  'space.contactsEdited',
  'space.profileConfirmed',
  'space.hoursConfirmed',
  'space.pricesConfirmed',
  'space.amenitiesConfirmed',
  'space.contactsConfirmed',
  'space.photoAdded',
  'space.photoRemoved',
  'space.photosReordered',
  'space.hidden',
  'space.unhidden',
  'space.deleted',
  'space.restored',
  'space.ownerLinked',
  'space.ownerUnlinked',
  'governorate.added',
  'governorate.edited',
  'governorate.hidden',
  'governorate.restored',
  'area.added',
  'area.edited',
  'area.hidden',
  'area.restored',
  'amenity.added',
  'amenity.edited',
  'amenity.hidden',
  'amenity.restored',
  'dataReport.resolved',
  'dataReport.dismissed',
] as const;

/**
 * An account's events: the platform's only when they name no space — an owner's staff account's
 * name the space, and are the space's (ADR 0009).
 */
export const PLATFORM_ACCOUNT_ACTIONS = [
  'user.created',
  'user.roleChanged',
  'user.suspended',
  'user.unsuspended',
  'user.temporaryPasswordIssued',
  'user.temporaryPasswordHandedOver',
  'user.emailChanged',
] as const;

const isListed = (list: readonly string[], action: string) => list.includes(action);

/** Whether the admin sees an entry (pure): the rule `platformEventsSql` states in SQL. */
export function isPlatformEvent({
  action,
  spaceId,
}: {
  action: string;
  spaceId: number | null;
}): boolean {
  return (
    isListed(PLATFORM_ACTIONS, action) ||
    (isListed(PLATFORM_ACCOUNT_ACTIONS, action) && spaceId === null)
  );
}

/** The same rule over the entry `a` of `audit_logs`, built from the same two lists. */
export function platformEventsSql(): Prisma.Sql {
  return Prisma.sql`(a."action" = ANY(${[...PLATFORM_ACTIONS]}::text[])
    OR (a."action" = ANY(${[...PLATFORM_ACCOUNT_ACTIONS]}::text[]) AND a."space_id" IS NULL))`;
}
