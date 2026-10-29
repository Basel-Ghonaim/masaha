import { Badge } from '@shared/design-system';
import type { PublicItemView } from '../../types/PublicItemView';

/**
 * One announcement as a space's public page lists it: its type's badge and its period, then its text
 * in its own language. The sheet's preview and the space's page draw it.
 */
export function AnnouncementItem({ item }: { item: PublicItemView }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={item.type.tone}>{item.type.label}</Badge>
        <span className="text-caption text-muted-foreground">{item.period}</span>
      </div>
      <p
        className="text-body break-words whitespace-pre-line"
        lang={item.text.lang}
        dir={item.text.dir}
      >
        {item.text.text}
      </p>
    </div>
  );
}
