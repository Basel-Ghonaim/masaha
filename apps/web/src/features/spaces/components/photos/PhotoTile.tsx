import { Badge, Button, XIcon } from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import type { ReactNode } from 'react';
import type { PhotoTileView } from '../../types/PhotoTileView';

/**
 * One photo in the gallery's edit state: its picture, «الغلاف» on the first (P6), and its removal,
 * which asks first (P5). The removal sits beside the picture, never inside what drags it (`picture`
 * lets the caller wrap the picture), so its keys and its click stay its own.
 */
export function PhotoTile({
  tile,
  cover,
  picture,
}: {
  tile: PhotoTileView;
  cover: string;
  picture?: (image: ReactNode) => ReactNode;
}) {
  const image = (
    <img
      src={tile.image.src}
      alt={tile.label}
      className="aspect-video w-full object-cover"
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  );
  return (
    <div className="flex flex-col gap-2">
      <div className="relative overflow-hidden rounded-lg border border-border bg-muted">
        {picture ? picture(image) : image}
        {tile.cover && (
          <Badge variant="primary" className="pointer-events-none absolute top-2 start-2">
            {cover}
          </Badge>
        )}
        {tile.remove && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute top-2 end-2"
            aria-label={tile.remove.label}
            onClick={tile.remove.run}
          >
            <XIcon aria-hidden />
          </Button>
        )}
      </div>
      {tile.failure && <FormFailure view={tile.failure} />}
    </div>
  );
}
