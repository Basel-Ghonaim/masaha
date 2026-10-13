import type { ReactNode } from 'react';
import type { ReadOnlyRow } from '../../types/ReadOnlyRow';

/**
 * Labelled values to read, one under another, each text in its own language; a value the space has
 * none of shows `none`. `before` holds rows the page draws itself, such as a name from another
 * capability.
 */
export function ReadOnlyRows({
  rows,
  none,
  before,
}: {
  rows: ReadOnlyRow[];
  none: string;
  before?: ReactNode;
}) {
  return (
    <dl className="flex flex-col divide-y divide-border">
      {before}
      {rows.map((row) => (
        <ReadOnlyItem key={row.label} label={row.label}>
          {row.value === null ? (
            <span className="text-muted-foreground">{none}</span>
          ) : (
            <span lang={row.lang} dir={row.dir} className="whitespace-pre-line">
              {row.value}
            </span>
          )}
        </ReadOnlyItem>
      ))}
    </dl>
  );
}

/** One labelled value of a read-only section. */
export function ReadOnlyItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-2 md:grid-cols-3">
      <dt className="text-body-sm text-muted-foreground">{label}</dt>
      <dd className="text-body md:col-span-2">{children}</dd>
    </div>
  );
}
