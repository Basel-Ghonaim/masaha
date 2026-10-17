import { useRef } from 'react';
import { Button, EmptyState, Skeleton } from '@shared/design-system';
import { usePhotoGallery } from '../../hooks/photos/usePhotoGallery';
import { EditorFailure } from '../editor/EditorFailure';
import { PhotoRemoveDialog } from './PhotoRemoveDialog';
import { PhotoTile } from './PhotoTile';
import { PhotoUploadTile } from './PhotoUploadTile';
import { PhotosCard } from './PhotosCard';

/**
 * «الصور»: the space's photos in the server's order, the first as the cover, each with its arrows, its
 * «اجعلها الغلاف» and its removal — which asks first — and below them «إضافة صور», the picker the
 * section's own button opens, and each chosen file's own tile while it travels. Photos are immediate
 * actions, so this section carries no date and nothing to save; its loading, failure and empty shapes
 * are the editor's own, reused.
 */
export function PhotosSection({
  spaceId,
  onUploadingChange,
}: {
  spaceId: number;
  /** The editor's leave guard: only an unfinished upload is lost by leaving. */
  onUploadingChange: (uploading: boolean) => void;
}) {
  const gallery = usePhotoGallery(spaceId, onUploadingChange);
  const picker = useRef<HTMLInputElement>(null);

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
      ) : gallery.empty !== null && gallery.uploads.tiles.length === 0 ? (
        <EmptyState titleAs="h3" title={gallery.empty.title} description={gallery.empty.text} />
      ) : (
        <ul aria-label={gallery.title} className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {gallery.tiles.map((tile) => (
            <PhotoTile key={tile.key} tile={tile} />
          ))}
          {gallery.uploads.tiles.map((tile) => (
            <PhotoUploadTile key={tile.key} tile={tile} />
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {/* The layer has no file control: the picker is behind the section's own button, and the
            input keeps the browser's own name for it where it is in the focus order. */}
        <input
          ref={picker}
          type="file"
          accept={gallery.uploads.input.accept}
          multiple={gallery.uploads.input.multiple}
          className="sr-only"
          tabIndex={-1}
          aria-label={gallery.uploads.input.label}
          onChange={(event) => {
            gallery.uploads.input.choose(event.target.files);
            event.target.value = '';
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={gallery.uploads.disabled}
          onClick={() => {
            picker.current?.click();
          }}
        >
          {gallery.uploads.label}
        </Button>
        {gallery.uploads.reason && (
          <span className="text-caption text-muted-foreground">{gallery.uploads.reason}</span>
        )}
        {gallery.uploads.summary && (
          <p className="text-caption text-muted-foreground">{gallery.uploads.summary}</p>
        )}
      </div>
      <PhotoRemoveDialog dialog={gallery.remove} />
    </PhotosCard>
  );
}
