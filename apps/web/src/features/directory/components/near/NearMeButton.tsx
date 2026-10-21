import { Button } from '@shared/design-system';
import type { DirectoryListView } from '../../types/DirectoryListView';

/** «الأقرب إليّ»: pressed while the list sorts by distance, busy while the location is asked. */
export function NearMeButton({ button }: { button: DirectoryListView['near']['button'] }) {
  return (
    <Button
      size="sm"
      variant={button.on ? 'secondary' : 'outline'}
      aria-pressed={button.on}
      loading={button.locating}
      onClick={button.press}
    >
      {button.label}
    </Button>
  );
}
