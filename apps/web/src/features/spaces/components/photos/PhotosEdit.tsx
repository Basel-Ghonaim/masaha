import { Button } from '@shared/design-system';
import { useCopy } from '@shared/copy';
import { useRef, type RefObject } from 'react';
import { meanwhileLines } from '../../hooks/editor/meanwhileLines';
import type { EditorPlace } from '../../types/EditorPlace';
import type { PhotoGalleryView } from '../../types/PhotoGalleryView';
import { PhotoRemoveDialog } from './PhotoRemoveDialog';
import { PhotoTile } from './PhotoTile';
import { PhotoUploadTile } from './PhotoUploadTile';

/**
 * The photos' edit state, in the section itself (P2, P3): «اختر صورًا» — many at once, the camera or
 * the gallery on a phone — with the limits beside it, or, at ten photos, the line that says so in its
 * place; what the last choice did; each photo with its removal, which asks first; and each chosen
 * file's own tile while it travels. Every change saves at once.
 */
export function PhotosEdit({
  place,
  gallery,
  choose,
}: {
  place: EditorPlace;
  gallery: PhotoGalleryView;
  /** «اختر صورًا», which the header's «أضف صورة غلاف» gives the focus to. */
  choose: RefObject<HTMLButtonElement | null>;
}) {
  const meanwhile = meanwhileLines(place, useCopy(), 'photos');
  const picker = useRef<HTMLInputElement>(null);
  const grid = useRef<HTMLUListElement>(null);
  // The removal that opened the dialog, which takes the focus back once it closes.
  const opener = useRef<HTMLElement | null>(null);
  const { uploads } = gallery;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border p-4">
        {uploads.full === null ? (
          <>
            {/* The layer has no file control: the picker is behind the section's own button. */}
            <input
              ref={picker}
              type="file"
              accept={uploads.input.accept}
              multiple={uploads.input.multiple}
              className="sr-only"
              tabIndex={-1}
              aria-label={uploads.input.label}
              onChange={(event) => {
                uploads.input.choose(event.target.files);
                event.target.value = '';
              }}
            />
            <Button
              ref={choose}
              type="button"
              onClick={() => {
                picker.current?.click();
              }}
            >
              {uploads.label}
            </Button>
            <span className="text-caption text-muted-foreground">{uploads.limits}</span>
          </>
        ) : (
          <p className="text-body-sm">{uploads.full}</p>
        )}
      </div>
      <p role="status" className="text-caption text-muted-foreground empty:hidden">
        {uploads.summary}
      </p>
      <ul ref={grid} className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {gallery.tiles.map((tile) => (
          <li key={tile.key} className="min-w-0">
            <PhotoTile
              tile={{
                ...tile,
                remove: tile.remove && {
                  label: tile.remove.label,
                  run: () => {
                    const active = document.activeElement;
                    opener.current = active instanceof HTMLElement ? active : null;
                    tile.remove?.run();
                  },
                },
              }}
              cover={gallery.view.cover}
            />
          </li>
        ))}
        {uploads.tiles.map((tile, index) => (
          <PhotoUploadTile
            key={tile.key}
            tile={tile}
            // Its place in the gallery, after the photos already on it.
            number={gallery.tiles.length + index + 1}
            meanwhile={meanwhile}
          />
        ))}
      </ul>
      <PhotoRemoveDialog
        dialog={gallery.remove}
        returnFocus={() => {
          const back = opener.current;
          opener.current = null;
          if (back?.isConnected) {
            back.focus();
            return;
          }
          // The photo is gone: the next one's removal, else «اختر صورًا».
          const next = grid.current?.querySelector<HTMLElement>('button');
          (next ?? choose.current)?.focus();
        }}
      />
    </div>
  );
}
