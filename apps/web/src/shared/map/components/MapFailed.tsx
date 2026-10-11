import { useCopy } from '@shared/copy';

/** The line shown when the map cannot load, its tiles or its code, pointing to the coordinates. */
export function MapFailed() {
  const copy = useCopy();

  return (
    <p role="status" className="text-caption text-muted-foreground">
      {copy.map.failed}
    </p>
  );
}
