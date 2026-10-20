import { currentCopy } from '@shared/copy';
import type { AppError } from '@shared/errors';
import { toast } from '@shared/design-system';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { EditorPlace } from '../../types/EditorPlace';
import type { PhotoTileView } from '../../types/PhotoTileView';
import { EDITOR_SCOPES } from '../editor/editorScope';
import { useSpaceAnswer } from '../editor/useSpaceAnswer';
import { staleGallery } from './staleGallery';

/**
 * Removing one photo, which asks first: the tile chosen is held until it is confirmed, and only then
 * is the photo removed, the gallery fetched again and a toast says what was deleted. A refusal keeps
 * the dialog open with its reason — a 403 or a 404 also fetches the space again, so the page shows
 * the space as it is now, whatever changed meanwhile.
 */
export function usePhotoRemove(place: EditorPlace, spaceId: number) {
  const scope = EDITOR_SCOPES[place];
  const client = useQueryClient();
  const answer = useSpaceAnswer(place, spaceId);
  const [target, setTarget] = useState<PhotoTileView | null>(null);

  const remove = useMutation<undefined, AppError, PhotoTileView>({
    mutationFn: (photo) => scope.repository.removePhoto(spaceId, photo.id),
    onSuccess: (_answer, photo) => {
      setTarget(null);
      void client.invalidateQueries({ queryKey: scope.photosKey(spaceId) });
      // The words are read as the toast is made, so it speaks the language of that moment.
      toast.success(currentCopy().spaces.toasts.photoRemoved({ photo: photo.label }));
    },
    onError: (refusal) => {
      answer.refused(refusal);
      void staleGallery(client, place, spaceId, refusal);
    },
  });

  return {
    /** The tile the dialog is about, or `null` while none is. */
    target,
    ask: (tile: PhotoTileView) => {
      remove.reset();
      setTarget(tile);
    },
    cancel: () => {
      remove.reset();
      setTarget(null);
    },
    confirm: () => {
      if (target !== null) remove.mutate(target);
    },
    busy: remove.isPending,
    refusal: remove.isError ? remove.error : null,
  };
}
