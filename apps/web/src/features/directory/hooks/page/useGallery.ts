import type { PhotoUrls } from '@masaha/shared/spaces';
import { useCopy } from '@shared/copy';
import { useState } from 'react';

// A phone shows the first tile alone; the others join it from 768 px.
const tileClasses = [
  'md:col-span-2 md:row-span-2',
  'hidden md:block',
  'hidden md:block',
  'hidden md:block',
  'hidden md:block',
] as const;

/**
 * The page gallery's responsive tiles and circular keyboard viewer, which remembers the tile that
 * opened it (`opener`), so closing it hands the focus back there.
 */
export function useGallery(photos: PhotoUrls[], name: string) {
  const words = useCopy().directory.page.gallery;
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [opener, setOpener] = useState(0);
  const shown = photos.slice(0, 5);
  const total = photos.length;
  const move = (delta: number) => {
    setIndex((current) => (current + delta + total) % total);
  };

  return {
    tiles: shown.map((photo, tileIndex) => ({
      key: `${String(tileIndex)}-${photo.card}`,
      src: photo.card,
      alt: words.photo({ n: tileIndex + 1, total, name }),
      className: tileClasses[tileIndex] ?? '',
      view: {
        label: words.view({ n: tileIndex + 1 }),
        run: () => {
          setIndex(tileIndex);
          setOpener(tileIndex);
          setOpen(true);
        },
      },
    })),
    layout:
      total <= 1
        ? 'grid-cols-1'
        : total === 2
          ? 'grid-cols-1 md:grid-cols-2'
          : 'grid-cols-1 md:grid-cols-4',
    more:
      total > 1
        ? {
            label: words.all({ count: total }),
            run: () => {
              setIndex(0);
              setOpener(0);
              setOpen(true);
            },
          }
        : null,
    viewer: {
      open,
      setOpen,
      title: words.label({ name }),
      closeLabel: words.close,
      position: index,
      total,
      opener,
      src: photos[index]?.page ?? '',
      alt: words.photo({ n: index + 1, total, name }),
      previous:
        total > 1
          ? {
              label: words.previous,
              run: () => {
                move(-1);
              },
            }
          : null,
      next:
        total > 1
          ? {
              label: words.next,
              run: () => {
                move(1);
              },
            }
          : null,
      close: () => {
        setOpen(false);
      },
    },
  };
}
