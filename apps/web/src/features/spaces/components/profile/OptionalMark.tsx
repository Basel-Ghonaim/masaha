/** Beside a field's label: the field may stay empty. */
export function OptionalMark({ label }: { label: string }) {
  return <span className="text-caption text-muted-foreground">{label}</span>;
}
