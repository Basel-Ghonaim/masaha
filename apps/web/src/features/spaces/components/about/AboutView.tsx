import { Button, cn } from '@shared/design-system';
import { useState } from 'react';
import type { AboutColumnView } from '../../hooks/about/useAboutSection';

/**
 * One language of «عن المساحة»: its heading, then the name and the description in that language and
 * its direction, a long description folded to four lines, and what a missing one costs.
 */
function AboutColumn({ column }: { column: AboutColumnView }) {
  const [all, setAll] = useState(false);
  const dir = column.lang === 'ar' ? 'rtl' : 'ltr';
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <h3 className="text-caption text-muted-foreground">{column.heading}</h3>
      {column.name === null ? (
        <p className="text-body text-muted-foreground">{column.noName}</p>
      ) : (
        <p lang={column.lang} dir={dir} className="text-heading-3 break-words">
          {column.name}
        </p>
      )}
      {column.description !== null && (
        <p
          lang={column.lang}
          dir={dir}
          className={cn(
            'text-body whitespace-pre-line break-words',
            column.fold && !all && 'line-clamp-4',
          )}
        >
          {column.description}
        </p>
      )}
      {column.description !== null && column.fold && (
        <div>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="px-0"
            aria-expanded={all}
            onClick={() => {
              setAll(!all);
            }}
          >
            {all ? column.fold.less : column.fold.more}
          </Button>
        </div>
      )}
      {column.missing !== null && (
        <p className="rounded-lg bg-warning-subtle px-3 py-2 text-body-sm text-warning-subtle-foreground">
          {column.missing}
        </p>
      )}
    </div>
  );
}

/** «عن المساحة» as a visitor reads it: the two languages side by side, stacked below 768 px. */
export function AboutView({ columns }: { columns: AboutColumnView[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {columns.map((column) => (
        <AboutColumn key={column.lang} column={column} />
      ))}
    </div>
  );
}
