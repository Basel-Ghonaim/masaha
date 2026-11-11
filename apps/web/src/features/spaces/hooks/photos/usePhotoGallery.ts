import type { SpacePhoto } from '@masaha/shared/spaces';
import { useCopy } from '@shared/copy';
import { useRefusalView } from '@shared/forms';
import type { EditorPlace } from '../../types/EditorPlace';
import type { PhotoGalleryView } from '../../types/PhotoGalleryView';
import type { PhotoTileView } from '../../types/PhotoTileView';
import { meanwhileLines } from '../editor/meanwhileLines';
import { usePhotoRemove } from './usePhotoRemove';
import { usePhotosQuery } from './usePhotosQuery';
import { usePhotoUploads } from './usePhotoUploads';

/**
 * «الصور», ready to render (P1–P7, M1): the gallery as the server has it, the first its cover, read
 * as a visitor sees it, or, editing in place (P2), each photo with its removal — which asks first,
 * the cover's dialog saying the next one takes its place — the picker, and each chosen file's own
 * tile while it travels. Photos are no fact group: nothing here is dated, confirmed or saved. A 403
 * or a 404 on a write fetches the space again, so a space verified or deleted meanwhile changes the
 * page's shape rather than leaving a control that cannot work.
 */
export function usePhotoGallery(
  place: EditorPlace,
  spaceId: number,
  editable: boolean,
  onUploadingChange: (uploading: boolean) => void,
): PhotoGalleryView {
  const copy = useCopy();
  const words = copy.spaces.editor.photos;
  const query = usePhotosQuery(place, spaceId);
  const photos = query.data ?? [];
  const removal = usePhotoRemove(place, spaceId);
  const uploads = usePhotoUploads(place, spaceId, photos, onUploadingChange);
  const lines = meanwhileLines(place, copy, 'photos');
  const loaded = useRefusalView(query.error ?? null, words.loadFailed);
  const removalFailure = useRefusalView(removal.refusal, words.removeFailed, lines);

  /** One photo as the gallery shows it: its place in the order, and its own place in the list. */
  const tileOf = (photo: SpacePhoto, index: number): PhotoTileView => {
    const label = words.photo({ position: index + 1 });
    return {
      id: photo.id,
      key: `photo-${String(photo.id)}`,
      position: index + 1,
      label,
      cover: index === 0,
      image: { src: photo.urls.card },
      failure: null,
      remove: editable
        ? {
            label: words.removeNamed({ photo: label }),
            run: () => {
              removal.ask(tileOf(photo, index));
            },
          }
        : null,
    };
  };
  const tiles = query.isSuccess ? photos.map(tileOf) : [];
  const removingCover = removal.target?.cover === true && tiles.length > 1;

  return {
    state: query.isPending ? 'loading' : query.isSuccess ? 'ready' : 'failed',
    title: copy.spaces.editor.sectionNames.photos,
    count: words.count({ count: tiles.length }),
    failure: loaded.view,
    retry: {
      label: copy.status.retry,
      run: () => {
        void query.refetch();
      },
    },
    tiles,
    view: {
      cover: words.cover,
      total: words.total({ count: tiles.length }),
      others: words.others,
      // Past five, the last tile of the grid says how many more there are (P1).
      more:
        tiles.length > 5
          ? {
              text: words.more({ count: tiles.length - 5 }),
              label: words.moreNamed({ count: tiles.length - 5 }),
            }
          : null,
    },
    empty:
      query.isSuccess && tiles.length === 0
        ? { text: words.empty.text, hint: words.empty.hint, action: words.empty.action }
        : null,
    remove: {
      open: removal.target !== null,
      title: words.removeDialog.title,
      description: removingCover
        ? `${words.removeDialog.description} ${words.removeDialog.nextCover}`
        : words.removeDialog.description,
      cancelLabel: words.removeDialog.cancel,
      confirmLabel: words.removeDialog.confirm,
      confirm: removal.confirm,
      cancel: removal.cancel,
      failure: removalFailure.view,
    },
    uploads: {
      // The layer has no file control, so the picker is behind the section's own button: the input
      // takes any image, which on a phone opens its gallery and its camera alike (DI-7).
      input: {
        label: words.choose,
        accept: 'image/*',
        multiple: true,
        choose: (files) => {
          if (files !== null && files.length > 0) uploads.choose(files);
        },
      },
      label: words.choose,
      limits: words.limits,
      // At ten, the button gives way to the limit's line: never disabled without a reason (P3).
      full: uploads.canAdd ? null : words.full,
      summary: uploads.summary,
      tiles: uploads.tiles,
    },
  };
}
