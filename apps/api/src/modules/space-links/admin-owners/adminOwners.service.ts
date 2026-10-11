import type { AddedOwner, AddOwnerRequest } from '@masaha/shared/space-links';

import type { RunInTransaction, Tx } from '../../../db/index.ts';
import type { AuditWriter } from '../../../shared/audit/index.ts';
import { AppError } from '../../../shared/errors/index.ts';
import type { SpacesService } from '../../spaces/index.ts';
import type { Account, UsersService } from '../../users/index.ts';
import { ownerRoleFor } from '../ownerRole.ts';
import { createSpaceLinksRepository } from '../space-links.repository.ts';

interface Dependencies {
  runInTransaction: RunInTransaction;
  audit: AuditWriter;
  spaces: SpacesService;
  users: UsersService;
  /** The one clock (conventions §11): when a link ends. */
  now: () => Date;
}

/**
 * The admin's owners (ADR 0009): an owner added, a new account or one upgraded; a person linked to
 * a space as its owner, one space at a time, and unlinked. Every change takes the space's lock,
 * so a save on it decides on the links as they are (finding 43); a change on an existing account
 * then takes the person's session lock (conventions §13), so their links are counted while no
 * other change of them runs, and their global role follows them. A new account's row is inserted
 * under the space's lock.
 */
export function createAdminOwnersService({
  runInTransaction,
  audit,
  spaces,
  users,
  now,
}: Dependencies) {
  const repository = createSpaceLinksRepository();

  /** The space's lock, or 404 for a space that does not exist or is soft-deleted. */
  async function lockSpace(spaceId: number, tx: Tx): Promise<void> {
    if (!(await spaces.lock(spaceId, tx))) throw AppError.notFound(undefined, 'Space not found');
  }

  /** The space's lock, or the body's `spaceId` refused on its field, as the request named it. */
  async function lockChosenSpace(spaceId: number, tx: Tx): Promise<void> {
    if (!(await spaces.lock(spaceId, tx))) {
      throw AppError.validation({ spaceId: ['invalid_choice'] });
    }
  }

  /** An admin and a suspended account own no space. */
  function assertMayOwn(account: Account): void {
    if (account.role === 'ADMIN') {
      throw AppError.conflict('ACCOUNT_IS_ADMIN', 'An admin owns no space');
    }
    if (account.suspendedAt) throw AppError.conflict('ACCOUNT_SUSPENDED', 'Account suspended');
  }

  /** The audit entry of a new link. */
  function audited(actorId: number, spaceId: number, userId: number, tx: Tx, wasReception = false) {
    return audit(
      {
        actorId,
        action: 'space.ownerLinked',
        entityType: 'space',
        entityId: spaceId,
        spaceId,
        ...(wasReception && { before: { role: 'RECEPTION' } }),
        after: wasReception ? { userId, role: 'OWNER' } : { userId },
      },
      tx,
    );
  }

  /**
   * The person's global role, as their active owner links give it, counted under their lock: a
   * change ends their sessions and is audited (`users.changeRole`).
   */
  async function settleRole(actorId: number, account: Account, tx: Tx): Promise<void> {
    const role = ownerRoleFor(account.role, await repository.countOwnerLinks(account.id, tx));
    if (role) await users.changeRole(account, role, actorId, tx);
  }

  /**
   * Links the locked person to the locked space as its owner, unless they may not own it: an admin,
   * a suspended account, or the space's active reception. An owner already linked writes nothing.
   */
  async function linkLocked(
    actorId: number,
    spaceId: number,
    account: Account,
    tx: Tx,
  ): Promise<void> {
    assertMayOwn(account);
    const link = await repository.findLink(spaceId, account.id, tx);
    if (link && !link.deactivatedAt) {
      if (link.role === 'RECEPTION') {
        throw AppError.conflict('RECEPTION_LINK_ACTIVE', 'The space’s reception');
      }
      return;
    }
    await repository.linkOwner(spaceId, account.id, tx);
    // A reception row the owner had deactivated becomes an owner's: the entry says the role changed.
    await audited(actorId, spaceId, account.id, tx, link?.role === 'RECEPTION');
    await settleRole(actorId, account, tx);
  }

  /**
   * Upgrades the email's account to the space's owner, in one transaction (D2): it keeps its name
   * and password. Refused, in this order, for an admin, a suspended account, an owner already (who
   * is linked instead), an upgrade not asked for, and the space's active reception.
   */
  function upgrade(
    actorId: number,
    userId: number,
    { spaceId, upgradeExisting }: AddOwnerRequest,
  ): Promise<void> {
    return runInTransaction(async (tx) => {
      await lockChosenSpace(spaceId, tx);
      // Accounts are never deleted, so the email's account is still there.
      const account = await users.lockAccount(userId, tx);
      if (!account) throw AppError.conflict(undefined, 'Account not found');
      assertMayOwn(account);
      if (account.role === 'OWNER') {
        throw AppError.conflict('ALREADY_OWNER', 'Already an owner: link instead');
      }
      if (!upgradeExisting) {
        throw AppError.conflict('EMAIL_HAS_ACCOUNT', 'The email has an account: upgrade it');
      }
      await linkLocked(actorId, spaceId, account, tx);
    });
  }

  return {
    /**
     * Adds an owner to one space (D1, D2): a new account, an `OWNER` from the start, with a
     * temporary password answered once; or the email's account, upgraded only when asked. All of
     * it, or nothing, in one transaction.
     */
    async add(actorId: number, request: AddOwnerRequest): Promise<AddedOwner> {
      const existing = await users.findByEmail(request.email);
      if (existing) {
        await upgrade(actorId, existing.id, request);
        return { userId: existing.id, temporaryPassword: null };
      }

      const temporary = await users.issueTemporaryPassword();
      const { name, email, spaceId } = request;
      const userId = await runInTransaction(async (tx) => {
        await lockChosenSpace(spaceId, tx);
        const account = await users.createWithTemporaryPassword(
          { name, email, role: 'OWNER' },
          temporary.hash,
          actorId,
          tx,
        );
        // Another creation took the email meanwhile: sent again, it is that account's to upgrade.
        if (!account) {
          throw AppError.conflict('EMAIL_HAS_ACCOUNT', 'The email has an account: upgrade it');
        }
        await repository.linkOwner(spaceId, account.id, tx);
        await audited(actorId, spaceId, account.id, tx);
        return account.id;
      });
      return { userId, temporaryPassword: temporary.password };
    },

    /** Links the person to the space as its owner, in one transaction (D4). */
    link(actorId: number, spaceId: number, userId: number): Promise<void> {
      return runInTransaction(async (tx) => {
        await lockSpace(spaceId, tx);
        const account = await users.lockAccount(userId, tx);
        if (!account) throw AppError.validation({ userId: ['invalid_choice'] });
        await linkLocked(actorId, spaceId, account, tx);
      });
    },

    /**
     * Ends the person's owner link to the space, kept as deactivated (D6); the last one makes the
     * space unverified and the person a user again. Nothing to end writes nothing.
     */
    unlink(actorId: number, spaceId: number, userId: number): Promise<void> {
      return runInTransaction(async (tx) => {
        await lockSpace(spaceId, tx);
        const account = await users.lockAccount(userId, tx);
        if (!account) return;
        if (!(await repository.deactivateOwnerLink(spaceId, userId, now(), tx))) return;
        await audit(
          {
            actorId,
            action: 'space.ownerUnlinked',
            entityType: 'space',
            entityId: spaceId,
            spaceId,
            before: { userId },
          },
          tx,
        );
        await settleRole(actorId, account, tx);
      });
    },
  };
}

export type AdminOwnersService = ReturnType<typeof createAdminOwnersService>;
