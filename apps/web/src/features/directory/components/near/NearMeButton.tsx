import { Button, LoaderIcon } from '@shared/design-system';
import type { Ref } from 'react';
import type { DirectoryListView } from '../../types/DirectoryListView';

/**
 * «الأقرب إليّ»: pressed while the list sorts by distance, busy while the location is asked. Busy,
 * not disabled, so it keeps the focus while it waits; a press then does nothing.
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
      variant={button.on ? 'secondary' : 'outline'}
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
