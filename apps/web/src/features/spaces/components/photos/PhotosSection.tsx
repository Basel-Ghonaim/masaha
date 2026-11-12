import { Button, Skeleton } from '@shared/design-system';
import { useCopy } from '@shared/copy';
import { useEffect, useRef } from 'react';
import { usePhotoGallery } from '../../hooks/photos/usePhotoGallery';
import type { EditorPlace } from '../../types/EditorPlace';
import { EditorFailure } from '../editor/EditorFailure';
import { SectionCard } from '../editor/SectionCard';
import { PhotosEdit } from './PhotosEdit';
import { PhotosView } from './PhotosView';

/**
 * «الصور» (P1–P7): read as a visitor sees it, its head «N من 10 صور» and «إدارة الصور», which turns
 * the section itself into its edit state — no Sheet — and «تم», which turns it back. No date and no
 * staleness: photos are no fact group. With none, «لم تُضف صور بعد» and «أضف صورًا». The header's
 * «أضف صورة غلاف» opens the edit state too, the focus on «اختر صورًا» (`focusRequest`).
 */
export function PhotosSection({
  place,
  spaceId,
  editable,
  editing,
  focusRequest,
  onUploadingChange,
}: {
  place: EditorPlace;
  spaceId: number;
  editable: boolean;
  editing: { on: boolean; set: (on: boolean) => void };
  /** Changes each time «اختر صورًا» is to take the focus. */
  focusRequest: number;
  /** The editor's leave guard: only an unfinished upload is lost by leaving. */
  onUploadingChange: (uploading: boolean) => void;
}) {
  const words = useCopy().spaces.editor.photos;
  const gallery = usePhotoGallery(place, spaceId, editable, onUploadingChange);
  const choose = useRef<HTMLButtonElement>(null);
  const on = editable && editing.on;

  useEffect(() => {
    if (focusRequest === 0) return;
    choose.current?.scrollIntoView({ block: 'center' });
    choose.current?.focus();
  }, [focusRequest]);

  const head =
    !editable || (gallery.tiles.length === 0 && !on) ? undefined : (
      <Button
        type="button"
        size="sm"
        variant={on ? 'primary' : 'outline'}
        onClick={() => {
          editing.set(!on);
        }}
      >
        {on ? words.done : words.manage}
      </Button>
    );

  return (
    <SectionCard
      frame={{ id: 'photos', title: gallery.title, date: null, stale: null, edit: null }}
      meta={gallery.state === 'ready' ? gallery.count : undefined}
      action={head}
      empty={
        gallery.empty !== null && !on && gallery.uploads.tiles.length === 0
          ? {
              text: gallery.empty.text,
              hint: gallery.empty.hint,
              action: editable
                ? {
                    label: gallery.empty.action,
                    primary: true,
                    run: () => {
                      editing.set(true);
                    },
                  }
                : null,
            }
          : null
      }
    >
      {gallery.state === 'loading' ? (
        <Skeleton className="h-40 w-full" />
      ) : gallery.state === 'failed' ? (
        <EditorFailure message={gallery.failure?.message ?? gallery.title} retry={gallery.retry} />
      ) : on ? (
        <PhotosEdit place={place} gallery={gallery} choose={choose} />
      ) : (
        <PhotosView gallery={gallery} />
      )}
    </SectionCard>
  );
}
