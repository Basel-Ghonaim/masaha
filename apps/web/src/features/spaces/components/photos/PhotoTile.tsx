import { useCopy } from '@shared/copy';
import { ArrowDownIcon, ArrowUpIcon, Badge, Button, XIcon } from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import type { PhotoTileView } from '../../types/PhotoTileView';

/**
 * One photo of the gallery: its thumb, the cover's badge over it, and what may be done with it — the
 * two arrows that move it, «اجعلها الغلاف» under them while it is not the cover, and its removal at
 * the end. While actions are drawn the thumb carries no name of its own: every action names the
 * photo it acts on, so a screen reader hears «قبل: الصورة 3» and a reader hears what it does. The
 * arrows wait with `aria-disabled`, never `disabled`, so the focus stays where it was.
 *
 * A verified space's tiles have no actions to name them, so the thumb is named by its label.
 */
export function PhotoTile({ tile }: { tile: PhotoTileView }) {
  const words = useCopy().spaces.editor.photos;

  return (
    <li className="flex flex-col gap-2">
      <div className="relative overflow-hidden rounded-md border border-border">
        <img
          src={tile.image.src}
          alt={tile.actions === null ? tile.label : ''}
          className="aspect-video w-full object-cover"
          loading="lazy"
          decoding="async"
        />
        {tile.cover && (
          <Badge variant="primary" className="absolute top-2 start-2">
            {words.cover}
          </Badge>
        )}
      </div>
      {tile.failure && <FormFailure view={tile.failure} />}
      {tile.actions && (
        <>
          <div className="flex flex-wrap items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={tile.actions.before.label}
              aria-disabled={tile.actions.before.disabled || tile.actions.before.busy || undefined}
              aria-busy={tile.actions.before.busy || undefined}
              onClick={tile.actions.before.run}
            >
              <ArrowUpIcon aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={tile.actions.after.label}
              aria-disabled={tile.actions.after.disabled || tile.actions.after.busy || undefined}
              aria-busy={tile.actions.after.busy || undefined}
              onClick={tile.actions.after.run}
            >
              <ArrowDownIcon aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={tile.actions.remove.label}
              onClick={tile.actions.remove.run}
            >
              <XIcon aria-hidden />
            </Button>
          </div>
          {tile.actions.cover && (
            <Button type="button" variant="ghost" size="sm" onClick={tile.actions.cover.run}>
              {tile.actions.cover.label}
            </Button>
          )}
        </>
      )}
    </li>
  );
}
