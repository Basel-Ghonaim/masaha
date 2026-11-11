import { Button } from '@shared/design-system';

/** An empty section's words, and its one clear action, where the place may take it. */
export type SectionEmptyView = {
  text: string;
  hint?: string;
  action: { label: string; run: () => void; primary: boolean } | null;
};

/**
 * What a section says while it shows nothing (G3): what is missing, why it matters where it does,
 * and the action that adds it («أضف ساعات العمل»…), never disabled without a reason.
 */
export function SectionEmpty({ view }: { view: SectionEmptyView }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-6 text-center">
      <p className="text-body text-muted-foreground">{view.text}</p>
      {view.hint && <p className="text-body-sm text-muted-foreground">{view.hint}</p>}
      {view.action && (
        <Button
          type="button"
          variant={view.action.primary ? 'primary' : 'outline'}
          onClick={view.action.run}
        >
          {view.action.label}
        </Button>
      )}
    </div>
  );
}
