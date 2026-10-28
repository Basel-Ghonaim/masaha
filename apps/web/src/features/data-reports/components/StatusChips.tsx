import { ToggleGroup, ToggleGroupItem } from '@shared/design-system';

/** The status chips' view: their name, the chip on, each chip and the choice of another. */
export type StatusChipsView<Value extends string> = {
  label: string;
  value: Value;
  options: readonly { value: Value; label: string }[];
  choose: (value: Value) => void;
};

/**
 * «الكل · جديدة · تمت المراجعة» (DI-31): one chip on at a time, named as a group. Pressing the chip
 * that is on keeps it on: a list always shows one of them.
 */
export function StatusChips<Value extends string>({ chips }: { chips: StatusChipsView<Value> }) {
  return (
    <ToggleGroup
      type="single"
      aria-label={chips.label}
      value={chips.value}
      onValueChange={(value) => {
        const option = chips.options.find((each) => each.value === value);
        if (option !== undefined) chips.choose(option.value);
      }}
    >
      {chips.options.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value}>
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
