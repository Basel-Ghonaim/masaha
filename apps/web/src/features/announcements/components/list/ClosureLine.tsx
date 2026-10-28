/** A closure's line on its card, about extending the subscriptions it covered (DI-28). */
export function ClosureLine({ line }: { line: string }) {
  return <p className="text-caption text-muted-foreground">{line}</p>;
}
