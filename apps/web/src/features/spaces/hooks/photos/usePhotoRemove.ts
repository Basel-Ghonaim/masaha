import { currentCopy } from '@shared/copy';
import type { AppError } from '@shared/errors';
import { toast } from '@shared/design-system';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { createSpacesRepository } from '../../repository/spacesRepository';
import type { PhotoTileView } from '../../types/PhotoTileView';
import { useSpaceAnswer } from '../editor/useSpaceAnswer';
import { spacesKeys } from '../queryKeys';
import { staleGallery } from './staleGallery';

const repository = createSpacesRepository();

/**
 * Removing one photo, which asks first: the tile the admin chose is held until it is confirmed, and
 * only then is the photo removed, the gallery fetched again and a toast says what was deleted. A
 * refusal keeps the dialog open with its reason — a 403 or a 404 also fetches the space again, so a
 * space verified or deleted meanwhile shows as it is now.
 */
export function usePhotoRemove(spaceId: number) {
  const client = useQueryClient();
  const answer = useSpaceAnswer(spaceId);
  const [target, setTarget] = useState<PhotoTileView | null>(null);

  const remove = useMutation<undefined, AppError, PhotoTileView>({
    mutationFn: (photo) => repository.removePhoto(spaceId, photo.id),
    onSuccess: (_answer, photo) => {
      setTarget(null);
      void client.invalidateQueries({ queryKey: spacesKeys.photos(spaceId) });
      // The words are read as the toast is made, so it speaks the language of that moment.
      toast.success(currentCopy().spaces.toasts.photoRemoved({ photo: photo.label }));
    },
    onError: (refusal) => {
      answer.refused(refusal);
      void staleGallery(client, spaceId, refusal);
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
