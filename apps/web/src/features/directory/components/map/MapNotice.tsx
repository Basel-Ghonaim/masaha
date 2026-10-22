/** A muted line over the map's foot, as while the pins load or past their ceiling (design issue 20). */
export function MapNotice({ line }: { line: string }) {
  return (
    <p className="rounded-md border border-border bg-card px-3 py-1 text-caption text-muted-foreground shadow-raised">
      {line}
    </p>
  );
}
