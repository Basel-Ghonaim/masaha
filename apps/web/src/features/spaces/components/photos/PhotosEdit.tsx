import { Button, cn } from '@shared/design-system';
import { Sortable } from '@shared/design-system/sortable';
import { useCopy } from '@shared/copy';
import { useRef, type RefObject } from 'react';
import { meanwhileLines } from '../../hooks/editor/meanwhileLines';
import type { EditorPlace } from '../../types/EditorPlace';
import type { PhotoGalleryView } from '../../types/PhotoGalleryView';
import type { PhotoTileView } from '../../types/PhotoTileView';
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
  const copy = useCopy();
  const meanwhile = meanwhileLines(place, copy, 'photos');
  const picker = useRef<HTMLInputElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  // The removal that opened the dialog, which takes the focus back once it closes.
  const opener = useRef<HTMLElement | null>(null);
  const { uploads } = gallery;
  const byId = new Map(gallery.tiles.map((tile) => [tile.id, tile]));
  const coverName = (photo: string) => copy.spaces.editor.photos.coverNamed({ photo });
  // A removal remembers its button, which takes the focus back once the dialog closes.
  const withOpener = (tile: PhotoTileView): PhotoTileView => ({
    ...tile,
    remove: tile.remove && {
      label: tile.remove.label,
      run: () => {
        const active = document.activeElement;
        opener.current = active instanceof HTMLElement ? active : null;
        tile.remove?.run();
      },
    },
  });

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
      {gallery.changed !== null && (
        <p role="status" className="text-caption text-muted-foreground">
          {gallery.changed}
        </p>
      )}
      {gallery.order && (
        <p id="photos-order-hint" className="text-caption text-muted-foreground">
          {gallery.order.hint}
        </p>
      )}
      <div ref={grid}>
        {gallery.order ? (
          <Sortable
            items={gallery.tiles.map(({ id }) => id)}
            layout="grid"
            label={gallery.order.label}
            words={gallery.order.words}
            nameOf={(id) => byId.get(id)?.label ?? ''}
            onMove={gallery.order.move}
            disabled={gallery.order.held}
            className="grid-cols-2 gap-3 md:grid-cols-3"
            renderItem={(id, { handleProps, lifted, dragging }) => {
              const tile = byId.get(id);
              if (tile === undefined) return null;
              return (
                <PhotoTile
                  tile={withOpener(tile)}
                  cover={gallery.view.cover}
                  picture={(image) => (
                    // The picture is what a mouse, a finger or the keyboard moves; the removal
                    // beside it keeps its own click and keys.
                    <div
                      {...handleProps}
                      aria-label={tile.cover ? coverName(tile.label) : tile.label}
                      className={cn(
                        'cursor-grab select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                        // Drawn inside the picture: the tile's frame clips what lies outside it. While
                        // lifted the spark edge stands in for the focus ring.
                        (lifted || dragging) &&
                          'outline-2 -outline-offset-2 outline-spark focus-visible:-outline-offset-2 focus-visible:outline-spark',
                      )}
                    >
                      {image}
                    </div>
                  )}
                />
              );
            }}
          />
        ) : (
          <ul aria-label={gallery.title} className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {gallery.tiles.map((tile) => (
              <li key={tile.key} className="min-w-0">
                <PhotoTile tile={withOpener(tile)} cover={gallery.view.cover} />
              </li>
            ))}
          </ul>
        )}
      </div>
      <ul className="grid grid-cols-2 gap-3 empty:hidden md:grid-cols-3">
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
