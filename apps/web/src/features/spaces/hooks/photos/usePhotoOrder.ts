import type { SpacePhoto } from '@masaha/shared/spaces';
import { currentCopy, useCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import type { AppError } from '@shared/errors';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { EditorPlace } from '../../types/EditorPlace';
import { EDITOR_SCOPES } from '../editor/editorScope';
import { useSpaceAnswer } from '../editor/useSpaceAnswer';
import { staleGallery } from './staleGallery';

/** One move: the whole gallery, every id, first to last, the photo moved and where it stood. */
type Move = { ids: number[]; photoId: number; from: number };

/**
 * The gallery's order, by dragging (P4): each drop sends **every** id once, the first the cover,
 * because the contract refuses a partial list. The dropped order stays on screen while it is sent
 * (SD2): it is the user's act, kept as the section's own state — never written into the cache as a
 * guess — and it gives way to the gallery as the server has it once that is read again. Until then a
 * second move is held, so it is never computed from a list the first has changed.
 *
 * A 409 means the gallery changed since it was read: it is read again and the user told so. A 403 or
 * a 404 goes through the space's own answer, so the page shows the space as it is now; a refusal
 * puts the server's order back, with its reason on the photo moved.
 */
export function usePhotoOrder(place: EditorPlace, spaceId: number, photos: SpacePhoto[]) {
  const scope = EDITOR_SCOPES[place];
  const words = useCopy().spaces.editor.photos;
  const client = useQueryClient();
  const answer = useSpaceAnswer(place, spaceId);
  // The order dropped, shown until the gallery is read again.
  const [pending, setPending] = useState<number[] | null>(null);
  const [changed, setChanged] = useState<string | null>(null);
  const [refusedId, setRefusedId] = useState<number | null>(null);

  const move = useMutation<undefined, AppError, Move>({
    mutationFn: ({ ids }) => scope.repository.orderPhotos(spaceId, ids),
    // Returned, so the move is pending until the gallery is read again.
    onSuccess: async (_answer, { ids, photoId, from }) => {
      setRefusedId(null);
      await client.invalidateQueries({ queryKey: scope.photosKey(spaceId) });
      setPending(null);
      const copy = currentCopy().spaces.editor.photos;
      toast(
        ids[0] === photoId
          ? copy.covered({ photo: copy.photo({ position: from }) })
          : copy.orderSaved,
      );
    },
    onError: (refusal, { photoId }) => {
      setPending(null);
      setRefusedId(photoId);
      if (refusal.type === 'conflict') setChanged(words.orderChanged);
      else answer.refused(refusal);
      return staleGallery(client, place, spaceId, refusal);
    },
  });

  // Once the gallery is read again, the order kept for it gives way to the server's.
  const shown =
    pending === null ? photos : pending.flatMap((id) => photos.filter((photo) => photo.id === id));

  return {
    /** The photos in the order shown: the one dropped while it is sent. */
    photos: shown,
    /** Sends the order dropped, every id once; held while the last one is on its way. */
    move: (ids: number[], photoId: number) => {
      if (move.isPending || pending !== null) return;
      setChanged(null);
      setPending(ids);
      move.mutate({ ids, photoId, from: photos.findIndex(({ id }) => id === photoId) + 1 });
    },
    /** A move is on its way, or its gallery not yet read again: a second waits. */
    held: move.isPending || pending !== null,
    /** The refusal of the last move, for the photo it moved; a 409 is the gallery's own news. */
    refusal: move.isError && move.error.type !== 'conflict' ? move.error : null,
    refusedId,
    /** Why the gallery was read again under the user, for everyone to read. */
    changed,
  };
}
