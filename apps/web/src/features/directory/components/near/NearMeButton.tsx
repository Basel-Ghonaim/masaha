import { Button, LoaderIcon } from '@shared/design-system';
import type { Ref } from 'react';
import type { DirectoryListView } from '../../types/DirectoryListView';

/**
 * «الأقرب إليّ»: pressed while the list sorts by distance, busy while the location is asked. Busy,
 * not disabled, so it keeps the focus while it waits; a press then does nothing. Pressed, it takes a
 * chip's selected look, the spark's tint and edge, kept under the pointer (foundation §5).
 */
export function NearMeButton({
  button,
  ref,
}: {
  button: DirectoryListView['near']['button'];
  ref: Ref<HTMLButtonElement>;
}) {
  return (
    <Button
      ref={ref}
      size="sm"
      variant={button.on ? null : 'outline'}
      className={button.on ? 'border-spark bg-accent text-accent-foreground' : undefined}
      aria-pressed={button.on}
      aria-busy={button.locating || undefined}
      aria-disabled={button.locating || undefined}
      onClick={button.press}
    >
      {button.locating && <LoaderIcon aria-hidden className="motion-safe:animate-spin" />}
      {button.label}
    </Button>
  );
}
