import { EmptyState, Skeleton } from '@shared/design-system';
import { useReadOnlyPhotos } from '../../hooks/photos/useReadOnlyPhotos';
import type { EditorPlace } from '../../types/EditorPlace';
import { EditorFailure } from '../editor/EditorFailure';
import { PhotoTile } from './PhotoTile';
import { PhotosCard } from './PhotosCard';

/**
 * A verified space's photos: the same gallery, in the server's order, with the first as the cover and
 * no control to change anything — the server's `can()` refuses every write on such a space, and the
 * web's part is that it draws none.
 */
export function ReadOnlyPhotos({ place, spaceId }: { place: EditorPlace; spaceId: number }) {
  const gallery = useReadOnlyPhotos(place, spaceId);

  return (
    <PhotosCard id="photos" title={gallery.title}>
      {gallery.state === 'loading' ? (
        <Skeleton className="h-40 w-full" />
      ) : gallery.state === 'failed' ? (
        <EditorFailure message={gallery.failure?.message ?? gallery.title} retry={gallery.retry} />
      ) : gallery.empty !== null ? (
        <EmptyState titleAs="h3" title={gallery.empty.title} description={gallery.empty.text} />
      ) : (
        <ul aria-label={gallery.title} className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {gallery.tiles.map((tile) => (
            <PhotoTile key={tile.key} tile={tile} />
          ))}
        </ul>
      )}
    </PhotosCard>
  );
}
