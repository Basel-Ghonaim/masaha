import { useCopy } from '@shared/copy';
import { Button, Spinner } from '@shared/design-system';
import { useRefusalView } from '@shared/forms';
import type { PhotoUploadTileView } from '../../types/PhotoTileView';

/**
 * One file that is not on the server yet: its name, its own state, its own percentage, and — once it
 * has failed — the line that says why, with «إعادة المحاولة» where a re-send of the same bytes could
 * work and «أخرجها من القائمة» always. The layer has no progress component and no dependency is added
 * for one, so a pending tile is the layer's `Spinner` with the percentage as text beside it: honest,
 * and never a bar the design system does not have.
 *
 * A file the browser could not read never became a request: its line says so, and no retry is
 * offered, because re-choosing it would meet the same refusal.
 */
export function PhotoUploadTile({ tile }: { tile: PhotoUploadTileView }) {
  const words = useCopy().spaces.editor.photos;
  // Each tile reads its own refusal, so each counts down its own wait and none disturbs another.
  const { view } = useRefusalView(tile.refusal, tile.fileName, {
    payload_too_large: words.tooLarge,
    forbidden: words.verifiedMeanwhile,
    not_found: words.deletedMeanwhile,
  });
  const waiting =
    tile.state === 'preparing' ? words.preparing : words.uploading({ percent: tile.progress ?? 0 });
  const refusal = view === null ? null : view.message;
  const reference = view !== null && view.kind === 'refused' ? view.reference : undefined;

  return (
    <li className="flex flex-col gap-2">
      <span className="text-caption text-muted-foreground">{tile.fileName}</span>
      {tile.state !== 'failed' && (
        <div className="flex items-center gap-2 text-caption text-muted-foreground">
          {/* The spinner's own name is what a screen reader hears; the text beside it repeats it. */}
          <Spinner label={waiting} />
          <span aria-hidden>{waiting}</span>
        </div>
      )}
      {tile.state === 'failed' && (
        <>
          <p role="status" className="flex flex-col text-caption text-destructive">
            <span>{tile.unsupported ? words.unsupported : (refusal ?? words.loadFailed)}</span>
            {reference !== undefined && <span className="text-muted-foreground">{reference}</span>}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {tile.retry && (
              <Button type="button" variant="outline" size="sm" onClick={tile.retry.run}>
                {tile.retry.label}
              </Button>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={tile.drop.run}>
              {tile.drop.label}
            </Button>
          </div>
        </>
      )}
    </li>
  );
}
