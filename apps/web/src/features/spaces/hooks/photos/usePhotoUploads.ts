import { PHOTO_LIMIT, type SpacePhoto } from '@masaha/shared/spaces';
import { useCopy } from '@shared/copy';
import { isAppError, type AppError } from '@shared/errors';
import { canRetryUpload, shrinkImage, UnsupportedImageError } from '@shared/uploads';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { EditorPlace } from '../../types/EditorPlace';
import type { PhotoUploadState, PhotoUploadTileView } from '../../types/PhotoTileView';
import { EDITOR_SCOPES } from '../editor/editorScope';
import { useSpaceAnswer } from '../editor/useSpaceAnswer';
import { staleGallery } from './staleGallery';

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
  /** The choice it came from, whose line counts what of it went up. */
  batch: number;
};

/** What one choice of files was, and how much of it has gone up. */
type Batch = { selected: number; uploaded: number; cut: boolean };

const refused = (error: unknown): AppError | null => (isAppError(error) ? error : null);

/** The files that have not been refused yet: they are the ones that still need room. */
const waitingOn = (items: Pending[]) => items.filter((item) => item.state !== 'failed').length;

/**
 * The gallery's queue: the files chosen, one at a time and in the order chosen, each with
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
  place: EditorPlace,
  spaceId: number,
  photos: SpacePhoto[],
  onUploadingChange: (uploading: boolean) => void,
) {
  const copy = useCopy();
  const words = copy.spaces.editor.photos;
  const client = useQueryClient();
  const answer = useSpaceAnswer(place, spaceId);
  const [items, setItems] = useState<Pending[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  // The queue the loop reads; the state above is what the section draws.
  const queue = useRef<Pending[]>([]);
  const nextKey = useRef(0);
  const running = useRef(false);
  const batches = useRef(new Map<number, Batch>());
  const nextBatch = useRef(0);
  // Set when the section is left: the queue sends nothing more, and the file in flight is aborted.
  const left = useRef(false);
  const flight = useRef<AbortController | null>(null);
  // Read through a function: the flag changes while a request is awaited, which narrowing cannot see.
  const hasLeft = () => left.current;
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
        if (left.current) return;
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
      if (left.current) return;
      change(item.key, { state: 'uploading', progress: 0 });
      const request = new AbortController();
      flight.current = request;
      try {
        const photo = await EDITOR_SCOPES[place].repository.uploadPhoto(
          spaceId,
          file,
          (sent, total) => {
            change(item.key, { progress: Math.min(100, Math.round((sent / total) * 100)) });
          },
          request.signal,
        );
        const batch = batches.current.get(item.batch);
        if (batch !== undefined) batch.uploaded += 1;
        client.setQueryData(
          EDITOR_SCOPES[place].photosKey(spaceId),
          (stored: SpacePhoto[] | undefined) => [...(stored ?? []), photo],
        );
        write(queue.current.filter((pending) => pending.key !== item.key));
      } catch (error) {
        if (hasLeft()) return;
        const refusal = refused(error);
        if (refusal !== null) {
          // The space is fetched again, so the page shows it as it is now, as for any write.
          answer.refused(refusal);
          void staleGallery(client, place, spaceId, refusal);
        }
        change(item.key, { state: 'failed', progress: null, unsupported: false, refusal });
      } finally {
        flight.current = null;
      }
    },
    [answer, change, client, place, spaceId, write],
  );

  /** Drains the queue: one file at a time, the next only once the previous has been answered. */
  const drain = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      for (;;) {
        const next = queue.current.find((item) => !item.started);
        if (next === undefined || left.current) break;
        next.started = true;
        await send(next);
      }
    } finally {
      running.current = false;
    }
    if (left.current) return;
    // The queue has ended: what the last cut choice says is what really went up.
    const cut = [...batches.current.values()].filter((batch) => batch.cut).at(-1);
    if (cut !== undefined) {
      setSummary(words.summary({ uploaded: cut.uploaded, selected: cut.selected }));
    }
  }, [send, words]);

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
    left.current = false;
    return () => {
      left.current = true;
      flight.current?.abort();
      guard.current(false);
    };
  }, []);

  const choose = useCallback(
    (chosen: FileList | File[]) => {
      const files = [...chosen];
      const room = Math.max(0, PHOTO_LIMIT - photos.length - waitingOn(queue.current));
      const kept = files.slice(0, room);
      // A new choice ends the line about the last one.
      batches.current.clear();
      const batch = (nextBatch.current += 1);
      batches.current.set(batch, {
        selected: files.length,
        uploaded: 0,
        cut: kept.length < files.length,
      });
      setSummary(null);
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
            batch,
          })),
        ]);
      }
      // A choice the gallery had no room for all of says so once its queue ends: see `drain`.
      void drain();
    },
    [drain, photos.length, write],
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
