import { Badge, cn, useMediaQuery } from '@shared/design-system';
import type { PhotoGalleryView } from '../../types/PhotoGalleryView';
import type { PhotoTileView } from '../../types/PhotoTileView';

/** A photo's picture, filling its frame. */
function Picture({ tile, className }: { tile: PhotoTileView; className?: string }) {
  return (
    <img
      src={tile.image.src}
      alt={tile.label}
      className={cn('size-full object-cover', className)}
      loading="lazy"
      decoding="async"
    />
  );
}

/**
 * The photos as a visitor sees them (P1, M1): from 768 px the cover about two thirds wide beside a
 * 2×2 grid, its last tile «+N» past five; below it the cover 16:9 with «الغلاف» and the count, then
 * one row of small thumbnails scrolling sideways. The cover is always marked (P6).
 */
export function PhotosView({ gallery }: { gallery: PhotoGalleryView }) {
  const wide = useMediaQuery('(min-width: 768px)');
  const [cover, ...rest] = gallery.tiles;
  if (cover === undefined) return null;
  const badge = (
    <Badge variant="primary" className="absolute top-2 start-2">
      {gallery.view.cover}
    </Badge>
  );

  if (!wide) {
    return (
      <div className="flex flex-col gap-2">
        <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
          <Picture tile={cover} />
          {badge}
          <Badge variant="neutral" className="absolute bottom-2 end-2">
            {gallery.view.total}
          </Badge>
        </div>
        {rest.length > 0 && (
          <ul aria-label={gallery.view.others} className="flex gap-2 overflow-x-auto pb-1">
            {rest.map((tile) => (
              <li key={tile.key} className="h-18 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
                <Picture tile={tile} />
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const grid = rest.slice(0, 4);
  return (
    <div className="grid grid-cols-3 gap-2">
      <div
        className={cn(
          'relative aspect-video overflow-hidden rounded-lg bg-muted',
          grid.length > 0 ? 'col-span-2' : 'col-span-3',
        )}
      >
        <Picture tile={cover} />
        {badge}
      </div>
      {grid.length > 0 && (
        // The grid takes the cover's height, two rows of two: each picture fills its tile, so none
        // sets the row's height by its own.
        <ul aria-label={gallery.view.others} className="grid h-full grid-cols-2 grid-rows-2 gap-2">
          {grid.map((tile, index) => (
            <li key={tile.key} className="relative min-h-0 overflow-hidden rounded-md bg-muted">
              <Picture tile={tile} className="absolute inset-0" />
              {index === 3 && gallery.view.more && (
                <span
                  className="absolute inset-0 flex items-center justify-center bg-foreground/60 text-heading-3 text-background"
                  aria-label={gallery.view.more.label}
                  role="img"
                >
                  <span dir="ltr" aria-hidden>
                    {gallery.view.more.text}
                  </span>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
