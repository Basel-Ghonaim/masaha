/** The line shown when the map cannot load, its tiles or its code, in the caller's words. */
export function MapFailed({ line }: { line: string }) {
  return (
    <p role="status" className="text-caption text-muted-foreground">
      {line}
    </p>
  );
}
