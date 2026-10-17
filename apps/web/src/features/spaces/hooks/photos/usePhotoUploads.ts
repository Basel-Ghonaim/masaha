import { PHOTO_LIMIT, type SpacePhoto } from '@masaha/shared/spaces';
import { useCopy } from '@shared/copy';
import { isAppError, type AppError } from '@shared/errors';
import { canRetryUpload, shrinkImage, UnsupportedImageError } from '@shared/uploads';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createSpacesRepository } from '../../repository/spacesRepository';
import type { PhotoUploadState, PhotoUploadTileView } from '../../types/PhotoTileView';
import { useSpaceAnswer } from '../editor/useSpaceAnswer';
import { spacesKeys } from '../queryKeys';

const repository = createSpacesRepository();

/** One chosen file, as the queue holds it while it travels. */
type Pending = {
  key: string;
  file: File;
  state: PhotoUploadState;
  progress: number | null;
  unsupported: boolean;
  refusal: AppError | null;
  /** Whether the queue has already had its turn with it. */
  started: boolean;
};

const refused = (error: unknown): AppError | null => (isAppError(error) ? error : null);

/** The files that have not been refused yet: they are the ones that still need room. */
const waitingOn = (items: Pending[]) => items.filter((item) => item.state !== 'failed').length;

/**
 * The gallery's queue: the files the admin chose, one at a time and in the order chosen, each with
 * its own state, its own percentage and its own failure. A file is shrunk in the browser first, so a
 * photo that cannot be read there is refused where it was chosen and no request is made for it.
 *
 * The queue is this section's own state, not the query cache's: a `File` is a browser object and a
 * percentage is not server state (architecture.md › Where state lives). Each 201 answer is kept as
 * the server's own row, in its own position — keeping the answer, not predicting it. While any file
 * is being prepared or sent the editor's leave guard is told (`onUploadingChange`), for only that
 * long: an unfinished upload is the one thing this section could lose.
 */
export function usePhotoUploads(
  spaceId: number,
  photos: SpacePhoto[],
  onUploadingChange: (uploading: boolean) => void,
) {
  const copy = useCopy();
  const words = copy.spaces.editor.photos;
  const client = useQueryClient();
  const answer = useSpaceAnswer(spaceId);
  const [items, setItems] = useState<Pending[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  // The queue the loop reads; the state above is what the section draws.
  const queue = useRef<Pending[]>([]);
  const nextKey = useRef(0);
  const running = useRef(false);
  const uploading = waitingOn(items) > 0;

  const write = useCallback((next: Pending[]) => {
    queue.current = next;
    setItems(next);
  }, []);
  const change = useCallback(
    (key: string, patch: Partial<Pending>) => {
      write(queue.current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
    },
    [write],
  );

  /** One file: read it, send it, and keep the answer or the reason it could not. */
  const send = useCallback(
    async (item: Pending) => {
      change(item.key, { state: 'preparing', progress: null });
      let file: File;
      try {
        file = await shrinkImage(item.file);
      } catch (error) {
        // A file the browser cannot read is refused where it was chosen; nothing is sent for it.
        const unsupported = error instanceof UnsupportedImageError;
        change(item.key, {
          state: 'failed',
          progress: null,
          unsupported,
          refusal: unsupported ? null : refused(error),
        });
        return;
      }
      change(item.key, { state: 'uploading', progress: 0 });
      try {
        const photo = await repository.uploadPhoto(spaceId, file, (sent, total) => {
          change(item.key, { progress: Math.min(100, Math.round((sent / total) * 100)) });
        });
        client.setQueryData(spacesKeys.photos(spaceId), (stored: SpacePhoto[] | undefined) => [
          ...(stored ?? []),
          photo,
        ]);
        write(queue.current.filter((pending) => pending.key !== item.key));
      } catch (error) {
        const refusal = refused(error);
        if (refusal !== null && (refusal.status === 403 || refusal.status === 404)) {
          // A verified or deleted space turns the page read-only or shows the 404, as for any write.
          answer.refused(refusal);
        }
        change(item.key, { state: 'failed', progress: null, unsupported: false, refusal });
      }
    },
    [answer, change, client, spaceId, write],
  );

  /** Drains the queue: one file at a time, the next only once the previous has been answered. */
  const drain = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      for (;;) {
        const next = queue.current.find((item) => !item.started);
        if (next === undefined) break;
        next.started = true;
        await send(next);
      }
    } finally {
      running.current = false;
    }
  }, [send]);

  // The guard hears only the change: once when a file starts travelling and once when none does. The
  // callback is kept in a ref so telling it on unmount does not depend on its identity.
  const told = useRef(false);
  const guard = useRef(onUploadingChange);
  useEffect(() => {
    guard.current = onUploadingChange;
  });
  useEffect(() => {
    if (uploading === told.current) return;
    told.current = uploading;
    guard.current(uploading);
  }, [uploading]);
  useEffect(() => {
    return () => {
      guard.current(false);
    };
  }, []);

  const choose = useCallback(
    (chosen: FileList | File[]) => {
      const files = [...chosen];
      const room = Math.max(0, PHOTO_LIMIT - photos.length - waitingOn(queue.current));
      const kept = files.slice(0, room);
      if (kept.length > 0) {
        write([
          ...queue.current,
          ...kept.map((file) => ({
            key: `upload-${String((nextKey.current += 1))}`,
            file,
            state: 'preparing' as const,
            progress: null,
            unsupported: false,
            refusal: null,
            started: false,
          })),
        ]);
      }
      if (kept.length < files.length) {
        // What the gallery had room for went up; the rest of the choice is left out, and it says so.
        setSummary(words.summary({ uploaded: kept.length, selected: files.length }));
      }
      void drain();
    },
    [drain, photos.length, words, write],
  );

  const tiles: PhotoUploadTileView[] = items.map((item) => ({
    key: item.key,
    fileName: item.file.name,
    state: item.state,
    progress: item.progress,
    unsupported: item.unsupported,
    refusal: item.refusal,
    retry:
      item.state === 'failed' && item.refusal !== null && canRetryUpload(item.refusal)
        ? {
            label: words.retry,
            run: () => {
              // The same bytes, asked again: the file is kept on its tile for exactly this.
              write(
                queue.current.map((pending) =>
                  pending.key === item.key
                    ? {
                        ...pending,
                        state: 'preparing',
                        progress: null,
                        refusal: null,
                        started: false,
                      }
                    : pending,
                ),
              );
              void drain();
            },
          }
        : null,
    drop: {
      label: words.drop,
      run: () => {
        write(queue.current.filter((pending) => pending.key !== item.key));
      },
    },
  }));

  const full = photos.length + waitingOn(items) >= PHOTO_LIMIT;
  return {
    choose,
    busy: uploading,
    tiles,
    summary,
    canAdd: !full,
    addReason: full ? words.limitReason : null,
  };
}
