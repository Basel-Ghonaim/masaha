import type { SpacePhoto } from '@masaha/shared/spaces';
import { useCopy } from '@shared/copy';
import { useRefusalView } from '@shared/forms';
import type { PhotoGalleryView, PhotoRemoveDialogView } from '../../types/PhotoGalleryView';
import type { PhotoTileView } from '../../types/PhotoTileView';
import { usePhotoOrder } from './usePhotoOrder';
import { usePhotoRemove } from './usePhotoRemove';
import { usePhotosQuery } from './usePhotosQuery';
import { usePhotoUploads } from './usePhotoUploads';

/**
 * «الصور», the editor's section, ready to render: the gallery as the server has it, in its order,
 * with the first as the cover; each tile's arrows, its «اجعلها الغلاف» and its removal, which asks
 * first; the empty state; and the line a move or a cover leaves for a screen reader. Photos are no
 * fact group: nothing here is dated, confirmed or saved.
 *
 * Nothing moves before the server has answered: a move, a cover and a removal each fetch the gallery
 * again, and a 403 or a 404 on any of them fetches the space too, so a space verified or deleted
 * meanwhile changes the page's shape rather than leaving a control that cannot work.
 */
export function usePhotoGallery(
  spaceId: number,
  onUploadingChange: (uploading: boolean) => void,
): PhotoGalleryView {
  const copy = useCopy();
  const words = copy.spaces.editor.photos;
  const query = usePhotosQuery(spaceId);
  const photos = query.data ?? [];
  const order = usePhotoOrder(spaceId, photos);
  const removal = usePhotoRemove(spaceId);
  const uploads = usePhotoUploads(spaceId, photos, onUploadingChange);
  const lines = {
    forbidden: words.verifiedMeanwhile,
    not_found: words.deletedMeanwhile,
  };
  const loaded = useRefusalView(query.error ?? null, words.loadFailed);
  // A refusal of a write belongs to the tile it was for; the rest of the gallery is as it is.
  const tileFailure = useRefusalView(order.refusal, words.loadFailed, lines);
  const removalFailure = useRefusalView(removal.refusal, words.loadFailed, lines);

  /** One photo as the gallery shows it: its place in the order, and its own place in the list. */
  const tileOf = (photo: SpacePhoto, index: number): PhotoTileView => ({
    id: photo.id,
    key: `photo-${String(photo.id)}`,
    position: index + 1,
    label: words.photo({ position: index + 1 }),
    cover: index === 0,
    image: { src: photo.urls.card },
    failure: order.refusedId === photo.id ? tileFailure.view : null,
    actions: null,
  });

  const ready = query.isSuccess;
  const tiles = (ready ? photos.map(tileOf) : []).map((tile) => ({
    ...tile,
    actions: {
      before: order.moveBefore(tile.id),
      after: order.moveAfter(tile.id),
      cover: order.makeCover(tile.id),
      remove: {
        label: words.removeNamed({ photo: tile.label }),
        run: () => {
          removal.ask(tile);
        },
      },
    },
  }));

  const remove: PhotoRemoveDialogView = {
    open: removal.target !== null,
    title: removal.target === null ? '' : words.removeDialog.title({ photo: removal.target.label }),
    description: words.removeDialog.description,
    cancelLabel: words.removeDialog.cancel,
    confirmLabel: words.removeDialog.confirm,
    confirm: removal.confirm,
    cancel: removal.cancel,
    failure: removalFailure.view,
  };

  return {
    state: query.isPending
      ? ('loading' as const)
      : query.isSuccess
        ? ('ready' as const)
        : ('failed' as const),
    title: copy.spaces.editor.sections.photos,
    intro: words.intro,
    failure: loaded.view,
    retry: {
      label: copy.status.retry,
      run: () => {
        void query.refetch();
      },
    },
    tiles,
    empty:
      ready && tiles.length === 0 ? { title: words.empty.title, text: words.empty.text } : null,
    said: order.said,
    changed: order.changed,
    remove,
    uploads: {
      // The layer has no file control, so the picker is behind the section's own button: the input
      // takes any image, which on a phone opens its gallery and its camera alike.
      input: {
        label: words.choose,
        accept: 'image/*',
        multiple: true,
        choose: (files) => {
          if (files !== null && files.length > 0) uploads.choose(files);
        },
      },
      label: words.choose,
      disabled: !uploads.canAdd,
      reason: uploads.addReason,
      summary: uploads.summary,
      tiles: uploads.tiles,
    },
  };
}
