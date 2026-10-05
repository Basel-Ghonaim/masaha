import { useCopy } from '@shared/copy';
import { CardContent, Spinner } from '@shared/design-system';

/** The wait while where the recovery stands is first read. */
export function RecoveryLoading() {
  const copy = useCopy();

  return (
    <CardContent className="items-center py-6">
      <Spinner label={copy.status.loading} />
    </CardContent>
  );
}
