import { CircleCheckIcon, GlyphIcon, Skeleton } from '@shared/design-system';
import type { AmenitiesSectionView } from '../../hooks/amenities/useAmenitiesSection';
import { EditorFailure } from '../editor/EditorFailure';

/** The amenities a space offers, as tiles: three columns, two on a phone, each its icon and name. */
export function AmenitiesView({ view }: { view: AmenitiesSectionView }) {
  if (view.loading) return <Skeleton className="h-20 w-full" />;
  if (view.failure) {
    return <EditorFailure message={view.failure.message} retry={view.failure.retry} />;
  }
  return (
    <ul aria-label={view.label} className="grid grid-cols-2 gap-2 md:grid-cols-3">
      {view.items.map((item) => (
        <li
          key={item.key}
          className="flex min-w-0 items-center gap-2 rounded-lg bg-muted px-3 py-2 text-body-sm"
        >
          <span aria-hidden className="flex shrink-0 text-primary">
            {item.icon === null ? <CircleCheckIcon /> : <GlyphIcon name={item.icon} />}
          </span>
          <span lang={item.lang} className="min-w-0 break-words">
            {item.name}
          </span>
        </li>
      ))}
    </ul>
  );
}
