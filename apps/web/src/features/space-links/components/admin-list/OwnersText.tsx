/**
 * A space's owners, or for a space with none a dash that is read aloud as having none
 * (`noOwner`), never as a dash.
 */
export function OwnersText({ owners, noOwner }: { owners: string | null; noOwner: string }) {
  if (owners !== null) return <span dir="auto">{owners}</span>;
  return (
    <>
      <span aria-hidden className="text-muted-foreground">
        —
      </span>
      <span className="sr-only">{noOwner}</span>
    </>
  );
}
