import {
  Button,
  ChevronEndIcon,
  ChevronStartIcon,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/design-system';
import { cn } from '@shared/design-system';
import type { useGallery } from '../../hooks/page/useGallery';

type GalleryView = ReturnType<typeof useGallery>;

/** The public page's photo gallery, omitted when no photos were saved. */
export function Gallery({ gallery }: { gallery: GalleryView }) {
  if (gallery.tiles.length === 0) return null;
  return (
    <>
      <div className={cn('grid gap-2', gallery.layout)}>
        {gallery.tiles.map((tile, index) => (
          <button
            key={tile.key}
            type="button"
            aria-label={tile.view.label}
            className={cn(
              'relative overflow-hidden rounded-lg bg-muted text-start',
              tile.className,
            )}
            onClick={tile.view.run}
          >
            <img
              src={tile.src}
              alt={tile.alt}
              loading={index === 0 ? 'eager' : 'lazy'}
              className="aspect-video size-full object-cover"
            />
            {index === 0 && gallery.more !== null && (
              <span className="absolute bottom-3 end-3 rounded-full bg-background/90 px-3 py-1 text-body-sm">
                {gallery.more.label}
              </span>
            )}
          </button>
        ))}
      </div>
      <Dialog open={gallery.viewer.open} onOpenChange={gallery.viewer.setOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{gallery.viewer.title}</DialogTitle>
          </DialogHeader>
          <img
            src={gallery.viewer.src}
            alt={gallery.viewer.alt}
            className="max-h-96 w-full object-contain"
            dir="ltr"
          />
          <p className="text-center text-body-sm" dir="ltr">
            {gallery.viewer.position + 1} / {gallery.viewer.total}
          </p>
          <DialogFooter className="flex-row justify-between">
            {gallery.viewer.previous !== null && (
              <Button variant="outline" onClick={gallery.viewer.previous.run}>
                <ChevronStartIcon aria-hidden />
                {gallery.viewer.previous.label}
              </Button>
            )}
            {gallery.viewer.next !== null && (
              <Button variant="outline" onClick={gallery.viewer.next.run}>
                {gallery.viewer.next.label}
                <ChevronEndIcon aria-hidden />
              </Button>
            )}
            <DialogClose asChild>
              <Button variant="ghost">{gallery.viewer.closeLabel}</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
