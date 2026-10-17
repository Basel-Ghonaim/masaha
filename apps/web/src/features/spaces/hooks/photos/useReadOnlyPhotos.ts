import { useCopy } from '@shared/copy';
import { useRefusalView } from '@shared/forms';
import type { PhotoTileView } from '../../types/PhotoTileView';
import { usePhotosQuery } from './usePhotosQuery';

/**
 * A verified space's photos: the same gallery, in the server's order, with no action at all. The
 * server's `can()` refuses every write on a verified space, so the web draws nothing that could
 * change one; this is the editor's `readOnly`, not a rule of its own.
 */
export function useReadOnlyPhotos(spaceId: number) {
  const copy = useCopy();
  const words = copy.spaces.editor.photos;
  const query = usePhotosQuery(spaceId);
  const loaded = useRefusalView(query.error ?? null, words.loadFailed);
  const ready = query.isSuccess;
  const tiles: PhotoTileView[] = (query.data ?? []).map((photo, index) => ({
    id: photo.id,
    key: `photo-${String(photo.id)}`,
    position: index + 1,
    label: words.photo({ position: index + 1 }),
    cover: index === 0,
    image: { src: photo.urls.card },
    failure: null,
    actions: null,
  }));

  return {
    state: query.isPending
      ? ('loading' as const)
      : query.isSuccess
        ? ('ready' as const)
        : ('failed' as const),
    title: copy.spaces.editor.sections.photos,
    failure: loaded.view,
    retry: {
      label: copy.status.retry,
      run: () => {
        void query.refetch();
      },
    },
    tiles: ready ? tiles : [],
    empty:
      ready && tiles.length === 0 ? { title: words.empty.title, text: words.empty.text } : null,
  };
}
