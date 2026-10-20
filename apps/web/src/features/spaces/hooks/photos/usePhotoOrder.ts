import type { SpacePhoto } from '@masaha/shared/spaces';
import { useCopy } from '@shared/copy';
import type { AppError } from '@shared/errors';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import type { EditorPlace } from '../../types/EditorPlace';
import { EDITOR_SCOPES } from '../editor/editorScope';
import { useSpaceAnswer } from '../editor/useSpaceAnswer';
import { staleGallery } from './staleGallery';

/** One move: the whole gallery, every id, first to last, and the photo the admin acted on. */
type Move = { ids: number[]; photoId: number };

/** The order the gallery has, with one photo taken out and put at `to`. */
function permutation(photos: SpacePhoto[], id: number, to: number): number[] {
  const ids = photos.map((photo) => photo.id).filter((photoId) => photoId !== id);
  ids.splice(to, 0, id);
  return ids;
}

/**
 * The gallery's order: moving a photo one step before or after another, or making it the cover.
 * Every move sends **every** id, because the contract refuses a partial list, and nothing moves on
 * screen until the server has answered with 204 and the gallery has been fetched again — a move is no
 * guess about what the server will do.
 *
 * A 409 means the gallery changed since it was read: it is fetched again and the admin is told so. A
 * 403 or a 404 goes through the space's own answer, so a space verified or deleted meanwhile shows as
 * it is now, and the refusal is the tile's, read as any refusal is.
 */
export function usePhotoOrder(place: EditorPlace, spaceId: number, photos: SpacePhoto[]) {
  const scope = EDITOR_SCOPES[place];
  const copy = useCopy();
  const words = copy.spaces.editor.photos;
  const client = useQueryClient();
  const answer = useSpaceAnswer(place, spaceId);
  const [said, setSaid] = useState<string | null>(null);
  const [changed, setChanged] = useState<string | null>(null);
  const [refusedId, setRefusedId] = useState<number | null>(null);
  // One write at a time, from the click to the refetched gallery: a second would be computed from the
  // list the first has already changed. A ref, because two clicks can land before a render.
  const sending = useRef(false);

  const move = useMutation<undefined, AppError, Move>({
    mutationFn: ({ ids }) => scope.repository.orderPhotos(spaceId, ids),
    // Returned, so the move is pending until the gallery is fetched again.
    onSuccess: () => {
      setRefusedId(null);
      return client.invalidateQueries({ queryKey: scope.photosKey(spaceId) });
    },
    onError: (refusal, { photoId }) => {
      setRefusedId(photoId);
      if (refusal.type === 'conflict') setChanged(words.orderChanged);
      else answer.refused(refusal);
      return staleGallery(client, place, spaceId, refusal);
    },
    onSettled: () => {
      sending.current = false;
    },
  });

  /** Sends the whole order, and says where the photo stands once the server has taken it. */
  const send = (move_: Move, line: string) => {
    if (sending.current) return;
    sending.current = true;
    setSaid(null);
    setChanged(null);
    move.mutate(move_, {
      onSuccess: () => {
        setSaid(line);
      },
    });
  };

  const at = (id: number) => photos.findIndex((photo) => photo.id === id);
  /** The photo as the admin reads it, by its place in the order shown. */
  const label = (id: number) => words.photo({ position: at(id) + 1 });
  const total = photos.length;

  return {
    /** One step before the photo above it; unavailable on the first, which is the cover. */
    moveBefore: (id: number) => {
      const index = at(id);
      return {
        label: words.beforeNamed({ photo: label(id) }),
        disabled: index <= 0,
        busy: move.isPending,
        run: () => {
          if (index <= 0) return;
          send(
            { ids: permutation(photos, id, index - 1), photoId: id },
            words.moved({ photo: label(id), position: index, total }),
          );
        },
      };
    },
    /** One step after the photo below it; unavailable on the last. */
    moveAfter: (id: number) => {
      const index = at(id);
      return {
        label: words.afterNamed({ photo: label(id) }),
        disabled: index < 0 || index >= total - 1,
        busy: move.isPending,
        run: () => {
          if (index < 0 || index >= total - 1) return;
          send(
            { ids: permutation(photos, id, index + 1), photoId: id },
            words.moved({ photo: label(id), position: index + 2, total }),
          );
        },
      };
    },
    /** The cover is the first photo, so there is nothing to offer on the cover itself. */
    makeCover: (id: number) =>
      at(id) === 0
        ? null
        : {
            label: words.makeCoverNamed({ photo: label(id) }),
            run: () => {
              send(
                { ids: permutation(photos, id, 0), photoId: id },
                words.covered({ photo: label(id) }),
              );
            },
          },
    busy: move.isPending,
    /** The refusal of the last write, for the tile it was for; a 409 is the gallery's own news. */
    refusal: move.isError && move.error.type !== 'conflict' ? move.error : null,
    /** Why the gallery was refreshed under the admin, for everyone to read. */
    changed,
    refusedId,
    /** What the last accepted move or cover did, for the gallery's live region. */
    said,
    announce: setSaid,
  };
}
