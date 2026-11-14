import { CheckIcon, GlyphIcon } from '@shared/design-system';
import { knownAmenityIcon } from '@shared/lib';
import type { SpacePageView } from '../../types/SpacePageView';
import { Section } from './Section';

/** «المرافق»: one list, the platform's amenities with their icons, then the space's own. */
export function AmenitiesSection({
  amenities,
}: {
  amenities: NonNullable<SpacePageView['amenities']>;
}) {
  return (
    <Section title={amenities.title} meta={amenities.meta}>
      <ul className="flex flex-wrap gap-2">
        {amenities.items.map((item) => {
          const icon = knownAmenityIcon(item.icon);
          return (
            <li
              key={item.key}
              className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-body-sm"
            >
              {icon === null ? (
                <CheckIcon aria-hidden className="size-4" />
              ) : (
                <GlyphIcon name={icon} aria-hidden className="size-4" />
              )}
              <span lang={item.text.lang} dir={item.text.dir}>
                {item.text.text}
              </span>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
