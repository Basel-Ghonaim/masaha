import { Field, RadioGroup, RadioGroupItem } from '@shared/design-system';
import type { AnnouncementSheetView } from '../../hooks/sheet/useAnnouncementSheet';

/**
 * The announcement's type, one radio group named «النوع»: each type on its own row, its name and what
 * it does under it. The sheet focuses the checked one as it opens (DI-21).
 */
export function TypeChoice({
  view,
  disabled,
}: {
  view: AnnouncementSheetView['type'];
  disabled: boolean;
}) {
  return (
    <Field label={view.label} error={view.error}>
      <RadioGroup
        value={view.value}
        onValueChange={view.choose}
        disabled={disabled}
        className="flex flex-col gap-3"
      >
        {view.options.map((option) => (
          <Field
            key={option.value}
            orientation="horizontal"
            label={
              <span className="flex flex-col gap-0.5">
                <span>{option.label}</span>
                <span className="text-caption text-muted-foreground">{option.hint}</span>
              </span>
            }
          >
            <RadioGroupItem value={option.value} />
          </Field>
        ))}
      </RadioGroup>
    </Field>
  );
}
