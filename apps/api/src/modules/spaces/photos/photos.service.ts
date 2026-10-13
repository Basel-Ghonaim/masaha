import { randomBytes } from 'node:crypto';

import { PHOTO_LIMIT, type SpacePhoto } from '@masaha/shared/spaces';
import type { Logger } from 'pino';

import type { RunInTransaction, Tx } from '../../../db/index.ts';
import type { AuditWriter } from '../../../shared/audit/index.ts';
import { can, type Actor, type LoadedSpace } from '../../../shared/auth/index.ts';
import { AppError } from '../../../shared/errors/index.ts';
import { encodeImage } from '../../../shared/images/index.ts';
import type { Storage } from '../../../shared/storage/index.ts';
import { createSpaceRepository } from '../space/space.repository.ts';
import { objectKeyOf, objectKeysOf, PHOTO_OUTPUTS, urlsOf } from './photoSizes.ts';
import { createPhotosRepository, type PhotoRow } from './photos.repository.ts';

interface Dependencies {
  runInTransaction: RunInTransaction;
  audit: AuditWriter;
  /** Where the photos' files live (conventions §12). */
  storage: Storage;
  /** Where a file left behind is recorded (finding 63). */
  logger: Logger;
}

/**
 * A space's photos (spaces › Behaviour › Photos): at most `PHOTO_LIMIT`, in an order whose first
 * is the cover, each stored as WebP sizes under one random key. They carry no date and confirm
 * nothing (D8), so their changes go through their own path, not a fact group's: under the space's
 * lock, `can()` decides from the links read there (the admin while it is unverified, else its
 * owner), then the change and its audit entry, in one transaction. The files are stored before it
 * and removed when it refuses or fails: nothing reaches the network inside a transaction, and
 * nothing runs after the answer (ADR 0014). It takes the actor and the loaded space, so whichever
 * router calls it, `can()` decides.
 */
export function createPhotosService({ runInTransaction, audit, storage, logger }: Dependencies) {
  const spaces = createSpaceRepository();
  const photos = createPhotosRepository();

  function toPhoto({ id, key }: PhotoRow): SpacePhoto {
    return { id, urls: urlsOf(key, (objectKey) => storage.url(objectKey)) };
  }

  /**
   * Removes files that no row names, before the answer. A failure is no failure of the request:
   * the files are logged as left behind (finding 63).
   */
  async function discard(objectKeys: readonly string[]): Promise<void> {
    const results = await Promise.allSettled(objectKeys.map((key) => storage.remove(key)));
    const left = objectKeys.filter((_key, i) => results[i]?.status === 'rejected');
    if (left.length > 0) {
      logger.warn({ objectKeys: left }, '[storage:orphan] files no photo names were left behind');
    }
  }

  /**
   * Locks the space and decides whether `actor` may change its photos, on its links as they are
   * under the lock: every link change takes it (finding 43).
   */
  async function lockFor(actor: Actor, space: LoadedSpace, tx: Tx): Promise<void> {
    const current = await spaces.lock(space.id, tx);
    if (!current || current.deletedAt) throw AppError.notFound(undefined, 'Space not found');
    if (!can(actor, 'space.photos.manage', { links: await space.linksUnder(tx) })) {
      throw AppError.forbidden();
    }
  }

  return {
    /** The photos of a space, in their order; `not_found` once it is soft-deleted. */
    list(spaceId: number): Promise<SpacePhoto[]> {
      return runInTransaction(async (tx) => {
        // In share mode, as the space's read is: a change in progress is never read half done.
        if (!(await spaces.lockShared(spaceId, tx))) {
          throw AppError.notFound(undefined, 'Space not found');
        }
        return (await photos.listFor(spaceId, tx)).map(toPhoto);
      });
    },

    /**
     * Adds a photo, last (D9): its files made and stored first, then the row, decided again under
     * the space's lock, with its audit entry. A refusal or a failure there removes the files.
     */
    async upload(actor: Actor, space: LoadedSpace, bytes: Buffer): Promise<SpacePhoto> {
      // Cheap refusals first (S1), so a refused upload costs no decoding and no store: decided
      // again under the lock, which alone is sure.
      if (!can(actor, 'space.photos.manage', space)) throw AppError.forbidden();
      if ((await photos.count(space.id)) >= PHOTO_LIMIT) throw AppError.conflict();

      const images = await encodeImage(bytes, PHOTO_OUTPUTS);
      // 128 random bits: a key no one can guess, which names nothing about its uploader.
      const key = randomBytes(16).toString('base64url');
      const stored = await Promise.allSettled(
        images.map(({ name, bytes: file }) =>
          storage.put(objectKeyOf(key, name), { bytes: file, contentType: 'image/webp' }),
        ),
      );
      const failed = stored.find((result) => result.status === 'rejected');
      if (failed) {
        logger.error({ err: failed.reason as unknown }, 'A photo could not be stored');
        await discard(objectKeysOf(key));
        throw AppError.serviceUnavailable(undefined, 'Photo storage unavailable');
      }

      try {
        return await runInTransaction(async (tx) => {
          await lockFor(actor, space, tx);
          const before = await photos.listFor(space.id, tx);
          if (before.length >= PHOTO_LIMIT) throw AppError.conflict();
          const photo = await photos.create(space.id, key, before.length, tx);
          await audit(
            {
              actorId: actor.id,
              action: 'space.photoAdded',
              entityType: 'space',
              entityId: space.id,
              spaceId: space.id,
              before: { photoIds: before.map(({ id }) => id) },
              after: { photoIds: [...before.map(({ id }) => id), photo.id] },
            },
            tx,
          );
          return toPhoto(photo);
        });
      } catch (error) {
        await discard(objectKeysOf(key));
        throw error;
      }
    },

    /**
     * Removes a photo (D9): its row, the order closed up after it, and its audit entry, in one
     * transaction; then its files, before the answer. A photo the space does not have writes
     * nothing, so a removal retried after a lost answer succeeds (S4).
     */
    async remove(actor: Actor, space: LoadedSpace, photoId: number): Promise<void> {
      const removed = await runInTransaction(async (tx) => {
        await lockFor(actor, space, tx);
        const before = await photos.listFor(space.id, tx);
        const photo = before.find(({ id }) => id === photoId);
        if (!photo) return null;
        await photos.remove(space.id, photo.id, tx);
        await audit(
          {
            actorId: actor.id,
            action: 'space.photoRemoved',
            entityType: 'space',
            entityId: space.id,
            spaceId: space.id,
            before: { photoIds: before.map(({ id }) => id) },
            after: { photoIds: before.filter(({ id }) => id !== photoId).map(({ id }) => id) },
          },
          tx,
        );
        return photo;
      });
      if (removed) await discard(objectKeysOf(removed.key));
    },

    /**
     * Puts the photos in the order of `ids`, which must be exactly the space's photos, each once:
     * else the gallery changed since it was read (409). The first is the cover. The same order
     * writes nothing.
     */
    async reorder(actor: Actor, space: LoadedSpace, ids: readonly number[]): Promise<void> {
      await runInTransaction(async (tx) => {
        await lockFor(actor, space, tx);
        const before = (await photos.listFor(space.id, tx)).map(({ id }) => id);
        const exact =
          ids.length === before.length &&
          new Set(ids).size === ids.length &&
          ids.every((id) => before.includes(id));
        if (!exact) throw AppError.conflict(undefined, 'Not exactly the space’s photos');
        if (ids.every((id, i) => id === before[i])) return;

        await photos.setOrder(ids, tx);
        await audit(
          {
            actorId: actor.id,
            action: 'space.photosReordered',
            entityType: 'space',
            entityId: space.id,
            spaceId: space.id,
            before: { photoIds: before },
            after: { photoIds: [...ids] },
          },
          tx,
        );
      });
    },
  };
}

export type PhotosService = ReturnType<typeof createPhotosService>;
