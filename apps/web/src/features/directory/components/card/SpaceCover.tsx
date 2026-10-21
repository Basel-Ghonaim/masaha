import { useState } from 'react';

/**
 * The card's picture, in a frame of fixed ratio: the cover, or the space's mark when it has none or
 * its cover fails to load, so nothing moves.
 */
export function SpaceCover({ cover, mark }: { cover: string | null; mark: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  const shown = cover !== null && failed !== cover;

  return (
    <div className="relative flex aspect-2/1 w-full items-center justify-center overflow-hidden bg-muted md:aspect-video">
      {shown ? (
        <img
          src={cover}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
          onError={() => {
            setFailed(cover);
          }}
        />
      ) : (
        <span
          aria-hidden
          className="flex size-16 items-center justify-center rounded-xl bg-primary text-heading-1 text-primary-foreground"
        >
          {mark}
        </span>
      )}
    </div>
  );
}
