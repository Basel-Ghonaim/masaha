import { Field, ToggleGroup, ToggleGroupItem } from '@shared/design-system';
import { useViewSwitch } from '../../hooks/view/useViewSwitch';

/** «قائمة | خريطة» at every width (PU-013), its label read but not shown. */
export function ViewSwitch() {
  const view = useViewSwitch();

  return (
    <Field label={<span className="sr-only">{view.label}</span>}>
      <ToggleGroup type="single" value={view.value} onValueChange={view.choose}>
        {view.options.map((option) => (
          <ToggleGroupItem key={option.value} value={option.value}>
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </Field>
  );
}
