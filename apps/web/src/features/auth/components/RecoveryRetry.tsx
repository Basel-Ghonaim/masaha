import { useCopy } from '@shared/copy';
import {
  Button,
  CardContent,
  CircleAlertIcon,
  EmptyState,
  TriangleAlertIcon,
} from '@shared/design-system';
import type { ReadFailure } from '../types/ReadFailure';

/** The recovery could not be read: offline or the general error, with the offer to read it again. */
export function RecoveryRetry({ reason, retry }: { reason: ReadFailure; retry: () => void }) {
  const copy = useCopy();

  return (
    <CardContent>
      <EmptyState
        icon={reason === 'offline' ? <CircleAlertIcon /> : <TriangleAlertIcon />}
        title={copy.status[reason].title}
        description={copy.status[reason].description}
        className="py-4"
      >
        <Button variant="outline" onClick={retry}>
          {copy.status.retry}
        </Button>
      </EmptyState>
    </CardContent>
  );
}
