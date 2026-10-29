import { Button, FilterTag } from '@shared/design-system';
import { useState } from 'react';
import { ShowcaseGroup, ShowcaseSection } from '../../ShowcaseSection';

type FilterTagSamples = {
  title: string;
  caption: string;
  tags: { label: string; removeLabel: string }[];
  clear: string;
};

// Every tag starts in force; removing one hides it, and «مسح الفلاتر» brings them all back, so
// the preview can be pressed again.
export function FilterTagSection({ samples }: { samples: FilterTagSamples }) {
  const [removed, setRemoved] = useState<number[]>([]);

  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.caption}>
        <div className="flex flex-wrap items-center gap-2">
          {samples.tags.map((tag, index) =>
            removed.includes(index) ? null : (
              <FilterTag
                key={tag.label}
                removeLabel={tag.removeLabel}
                onRemove={() => {
                  setRemoved((current) => [...current, index]);
                }}
              >
                {tag.label}
              </FilterTag>
            ),
          )}
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              setRemoved([]);
            }}
          >
            {samples.clear}
          </Button>
        </div>
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
