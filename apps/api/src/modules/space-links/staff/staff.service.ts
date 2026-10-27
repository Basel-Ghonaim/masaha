import type { AddedStaff, AddStaffRequest, StaffMember } from '@masaha/shared/space-links';
import type { HandoverChannel } from '@masaha/shared/users';

import type { RunInTransaction, Tx } from '../../../db/index.ts';
import type { AuditWriter } from '../../../shared/audit/index.ts';
import { can, type Actor, type LoadedSpace } from '../../../shared/auth/index.ts';
import { AppError } from '../../../shared/errors/index.ts';
import type { SpacesService } from '../../spaces/index.ts';
import type { Account, UsersService } from '../../users/index.ts';
import { createSpaceLinksRepository, type ReceptionLink } from '../space-links.repository.ts';
import { toStaffMember } from './staff.mapper.ts';

interface Dependencies {
  runInTransaction: RunInTransaction;
  audit: AuditWriter;
  spaces: SpacesService;
  users: UsersService;
  /** The one clock (conventions §11): when a link is deactivated. */
  now: () => Date;
}

/**
 * The owner's staff (ADR 0009, revised): the space's reception accounts, created new by its owner
 * with a temporary password, listed whole. Every write takes the space's lock, so `can()` decides
 * on the links as they are (finding 43), then the person's session lock where it changes them
 * (conventions §13). Every account write is a `users` function (ADR 0013).
 */
export function createStaffService({ runInTransaction, audit, spaces, users, now }: Dependencies) {
  const repository = createSpaceLinksRepository();

  /** Locks the space and decides whether `actor` may manage its staff, on the links under it. */
  async function lockFor(actor: Actor, space: LoadedSpace, tx: Tx): Promise<void> {
    if (!(await spaces.lock(space.id, tx))) throw AppError.notFound(undefined, 'Space not found');
    if (!can(actor, 'staff.manage', { links: await space.linksUnder(tx) })) {
      throw AppError.forbidden();
    }
  }

  /**
   * The person's account under their session lock, taken after the space's: only with an active
   * reception link at the space, else 404.
   */
  async function lockActiveReception(space: LoadedSpace, userId: number, tx: Tx): Promise<Account> {
    const account = await users.lockAccount(userId, tx);
    const link = account ? await repository.findReceptionLink(space.id, userId, tx) : null;
    if (!account || !link || link.deactivatedAt !== null) {
      throw AppError.notFound(undefined, 'No active reception link here');
    }
    return account;
  }

  /** The member as the list shows them, read in the change's transaction. */
  async function memberOf(link: ReceptionLink, tx: Tx): Promise<StaffMember> {
    const [account] = await users.staffAccounts([link.userId], tx);
    if (!account) throw AppError.notFound(undefined, 'Account not found');
    return toStaffMember(link, account);
  }

  return {
    /**
     * Every reception link of the space, active or not, oldest first, whole: the links here, the
     * accounts from `users`, one query each (conventions §9, Composed reads).
     */
    async list(spaceId: number): Promise<StaffMember[]> {
      const links = await repository.findReceptionLinksAt(spaceId);
      if (links.length === 0) return [];
      const accounts = new Map(
        (await users.staffAccounts(links.map(({ userId }) => userId))).map((account) => [
          account.id,
          account,
        ]),
      );
      return links.flatMap((link) => {
        const account = accounts.get(link.userId);
        return account ? [toStaffMember(link, account)] : [];
      });
    },

    /**
     * Creates a new reception account and links it, in one transaction: the space's lock and
     * `can()`; the account, with a temporary password hashed before; its link; the audit. An email
     * that has an account is refused by the users' unique key, never looked up first, so no
     * existing account is ever linked by an owner (ADR 0009, revised).
     */
    async add(
      actor: Actor,
      space: LoadedSpace,
      { name, email }: AddStaffRequest,
    ): Promise<AddedStaff> {
      const temporary = await users.issueTemporaryPassword();
      const userId = await runInTransaction(async (tx) => {
        await lockFor(actor, space, tx);
        const account = await users.createWithTemporaryPassword(
          { name, email, role: 'USER' },
          temporary.hash,
          actor.id,
          tx,
          space.id,
        );
        // The unique violation ended the transaction: nothing more runs in it.
        if (!account) {
          throw AppError.conflict('EMAIL_HAS_ACCOUNT', 'The email has an account', {
            email: ['not_unique'],
          });
        }
        await repository.linkReception(space.id, account.id, tx);
        await audit(
          {
            actorId: actor.id,
            action: 'space.staffAdded',
            entityType: 'space',
            entityId: space.id,
            spaceId: space.id,
            after: { userId: account.id },
          },
          tx,
        );
        return account.id;
      });
      return { userId, temporaryPassword: temporary.password };
    },

    /**
     * Deactivates the person's reception link, ending every session they hold (the desk's shared
     * device must not stay signed in), or re-activates it, in one transaction: the space's lock and
     * `can()`, then the person's session lock. Only a reception link of this space: an owner's
     * link, a co-owner's, is never touched here. The same state writes nothing. A re-activation is
     * refused for a suspended account and an admin (P6).
     */
    setActive(
      actor: Actor,
      space: LoadedSpace,
      userId: number,
      isActive: boolean,
    ): Promise<StaffMember> {
      return runInTransaction(async (tx) => {
        await lockFor(actor, space, tx);
        const account = await users.lockAccount(userId, tx);
        const link = account ? await repository.findReceptionLink(space.id, userId, tx) : null;
        if (!account || !link) throw AppError.notFound(undefined, 'No reception link here');
        if ((link.deactivatedAt === null) === isActive) return memberOf(link, tx);

        const at = now();

        if (isActive) {
          if (!users.maySignIn(account)) {
            throw AppError.conflict('ACCOUNT_SUSPENDED', 'Account suspended');
          }
          if (account.role === 'ADMIN') throw AppError.conflict('ACCOUNT_IS_ADMIN', 'An admin');
          await repository.reactivateReceptionLink(space.id, userId, tx);
        } else {
          await repository.deactivateReceptionLink(space.id, userId, at, tx);
          await users.endSessions(userId, tx);
        }
        await audit(
          {
            actorId: actor.id,
            action: isActive ? 'space.staffReactivated' : 'space.staffDeactivated',
            entityType: 'space',
            entityId: space.id,
            spaceId: space.id,
            before: { userId, isActive: !isActive },
            after: { userId, isActive },
          },
          tx,
        );
        return memberOf({ userId, deactivatedAt: isActive ? null : at }, tx);
      });
    },

    /**
     * A new temporary password for the person, only while their first is still pending (a lost
     * answer, or one that expired), hashed before the transaction. Refused, in this order, without
     * an active reception link here (404), once the person has changed it (the account is theirs:
     * its recovery is the email or the admin), for a suspended account, and for an account that is
     * not a `USER` or holds any other active link (S5): no owner may take another space's account.
     */
    async issueTemporaryPassword(
      actor: Actor,
      space: LoadedSpace,
      userId: number,
    ): Promise<string> {
      const temporary = await users.issueTemporaryPassword();
      await runInTransaction(async (tx) => {
        await lockFor(actor, space, tx);
        const account = await lockActiveReception(space, userId, tx);
        if (!account.mustChangePassword) {
          throw AppError.conflict(
            'TEMPORARY_PASSWORD_NOT_PENDING',
            'No temporary password pending',
          );
        }
        if (!users.maySignIn(account)) {
          throw AppError.conflict('ACCOUNT_SUSPENDED', 'Account suspended');
        }
        if (
          account.role !== 'USER' ||
          (await repository.countOtherActiveLinks(userId, space.id, tx)) > 0
        ) {
          throw AppError.conflict('ACCOUNT_HAS_LINKS', 'The account holds other links');
        }
        await users.replaceWithTemporaryPassword(actor.id, userId, temporary.hash, tx, space.id);
      });
      return temporary.password;
    },

    /** Records how the person's pending temporary password was handed over, for this space. */
    recordHandover(
      actor: Actor,
      space: LoadedSpace,
      userId: number,
      channel: HandoverChannel,
    ): Promise<void> {
      return runInTransaction(async (tx) => {
        await lockFor(actor, space, tx);
        const account = await lockActiveReception(space, userId, tx);
        await users.recordHandoverLocked(actor.id, account, channel, tx, space.id);
      });
    },
  };
}

export type StaffService = ReturnType<typeof createStaffService>;
