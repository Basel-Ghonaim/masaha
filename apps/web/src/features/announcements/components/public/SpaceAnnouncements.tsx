import { useId } from 'react';
import { usePublicAnnouncements } from '../../hooks/public/usePublicAnnouncements';
import type { PublicAnnouncement } from '../../types/PublicAnnouncement';
import { AnnouncementItem } from './AnnouncementItem';

/**
 * A space's announcements on its public page (U8): a section «الإعلانات» listing them by their start,
 * the running closure left out, since its notice stands at the page's top (DI-59); nothing when none
 * is left.
 */
export function SpaceAnnouncements({ items }: { items: readonly PublicAnnouncement[] }) {
  const id = useId();
  const view = usePublicAnnouncements(items);
  if (view.items.length === 0) return null;

  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <h2 id={id} className="text-heading-2">
        {view.title}
      </h2>
      <ul className="flex flex-col gap-4">
        {view.items.map(({ key, item }) => (
          <li key={key} className="rounded-lg border border-border p-4">
            <AnnouncementItem item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}
