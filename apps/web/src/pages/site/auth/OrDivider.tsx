import { useCopy } from '@shared/copy';
import { Separator } from '@shared/design-system';

/** "or", between two lines: what separates Google's button from the email form below it. */
export function OrDivider() {
  const copy = useCopy();

  return (
    <div className="flex items-center gap-3 text-caption text-muted-foreground">
      <Separator className="flex-1" />
      <span>{copy.auth.or}</span>
      <Separator className="flex-1" />
    </div>
  );
}
