import { EmptyState, Skeleton } from '@shared/design-system';
import { usePhotoGallery } from '../../hooks/photos/usePhotoGallery';
import { EditorFailure } from '../editor/EditorFailure';
import { PhotoRemoveDialog } from './PhotoRemoveDialog';
import { PhotoTile } from './PhotoTile';
import { PhotosCard } from './PhotosCard';

/**
 * «الصور»: the space's photos in the server's order, the first as the cover, each with its arrows, its
 * «اجعلها الغلاف» and its removal — which asks first. Photos are immediate actions, so this section
 * carries no date and nothing to save; its loading, failure and empty shapes are the editor's own,
 * reused.
 */
export function PhotosSection({ spaceId }: { spaceId: number }) {
  const gallery = usePhotoGallery(spaceId);

  return (
    <PhotosCard id="photos" title={gallery.title} description={gallery.intro ?? undefined}>
      {/* A move or a cover that landed is said here: a change of order is otherwise silent. */}
      <p role="status" className="sr-only">
        {gallery.said}
      </p>
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
      <PhotoRemoveDialog dialog={gallery.remove} />
    </PhotosCard>
  );
}
