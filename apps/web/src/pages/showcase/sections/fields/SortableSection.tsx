import { cn, EllipsisVerticalIcon } from '@shared/design-system';
import { Sortable, type SortablePlace } from '@shared/design-system/sortable';
import { useState } from 'react';
import { ShowcaseGroup, ShowcaseSection } from '../../ShowcaseSection';

type SortableSamples = {
  title: string;
  gridCaption: string;
  gridLabel: string;
  listCaption: string;
  listLabel: string;
  heldCaption: string;
  tiles: string[];
  rows: string[];
  first: string;
  handle: string;
  roleDescription: string;
  instructions: string;
  lifted: string;
  moved: string;
  dropped: string;
  cancelled: string;
  held: string;
};

// The words are templates in the fixtures, filled here: {name}, {position}, {count}. Every
// fixture string is searched for in the build, so the fixtures hold phrases only.
const fill = (template: string, { name, position, count }: SortablePlace) =>
  template
    .replace('{name}', name)
    .replace('{position}', String(position))
    .replace('{count}', String(count));

export function SortableSection({ samples }: { samples: SortableSamples }) {
  const [tiles, setTiles] = useState(() => samples.tiles.map((_, index) => index));
  const [rows, setRows] = useState(() => samples.rows.map((_, index) => index));
  const words = {
    roleDescription: samples.roleDescription,
    instructions: samples.instructions,
    lifted: (place: SortablePlace) => fill(samples.lifted, place),
    moved: (place: SortablePlace) => fill(samples.moved, place),
    dropped: (place: SortablePlace) => fill(samples.dropped, place),
    cancelled: (place: SortablePlace) => fill(samples.cancelled, place),
    held: (place: SortablePlace) => fill(samples.held, place),
  };
  const tileName = (id: number) => samples.tiles[id] ?? '';
  const rowName = (id: number) => samples.rows[id] ?? '';

  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.gridCaption}>
        <Sortable
          items={tiles}
          layout="grid"
          label={samples.gridLabel}
          words={words}
          nameOf={tileName}
          onMove={setTiles}
          className="w-full max-w-120 grid-cols-2 md:grid-cols-3"
          renderItem={(id, { handleProps, lifted, dragging }) => (
            <div
              {...handleProps}
              aria-label={tileName(id)}
              className={cn(
                'flex aspect-4/3 cursor-grab flex-col justify-between rounded-lg border border-border bg-card p-3 text-body-sm text-card-foreground select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                (lifted || dragging) && 'border-primary shadow-floating',
              )}
            >
              <span>{tileName(id)}</span>
              {tiles[0] === id ? (
                <span className="text-caption text-muted-foreground">{samples.first}</span>
              ) : null}
            </div>
          )}
        />
      </ShowcaseGroup>
      <ShowcaseGroup caption={samples.listCaption}>
        <Sortable
          items={rows}
          layout="list"
          label={samples.listLabel}
          words={words}
          nameOf={rowName}
          onMove={setRows}
          className="w-full max-w-120"
          renderItem={(id, { handleProps, lifted, dragging }) => (
            <div
              className={cn(
                'flex items-center gap-2 rounded-lg border border-border bg-card p-2 text-body-sm text-card-foreground',
                (lifted || dragging) && 'border-primary shadow-floating',
              )}
            >
              <span
                {...handleProps}
                aria-label={fill(samples.handle, { name: rowName(id), position: 0, count: 0 })}
                className="flex size-9 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground select-none hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <EllipsisVerticalIcon />
              </span>
              <span>{rowName(id)}</span>
            </div>
          )}
        />
      </ShowcaseGroup>
      <ShowcaseGroup caption={samples.heldCaption}>
        <Sortable
          items={rows}
          layout="list"
          label={samples.listLabel}
          words={words}
          nameOf={rowName}
          onMove={setRows}
          disabled
          className="w-full max-w-120"
          renderItem={(id, { handleProps }) => (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-2 text-body-sm text-card-foreground opacity-60">
              <span
                {...handleProps}
                aria-label={fill(samples.handle, { name: rowName(id), position: 0, count: 0 })}
                className="flex size-9 shrink-0 cursor-not-allowed items-center justify-center rounded-md text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <EllipsisVerticalIcon />
              </span>
              <span>{rowName(id)}</span>
            </div>
          )}
        />
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
