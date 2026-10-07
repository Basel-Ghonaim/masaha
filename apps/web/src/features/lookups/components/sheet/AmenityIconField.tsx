import { Field, RadioGroup, RadioGroupItem } from '@shared/design-system';
import type { AmenityFormView } from '../../types/AmenityFormView';
import { AmenityIcon } from '../AmenityIcon';

/**
 * An amenity's icon, chosen from a grid of every icon it may take: one named group, each option a
 * radio named by its icon's name, the arrow keys moving the choice along the reading direction.
 */
export function AmenityIconField({
  icon,
  error,
}: {
  icon: AmenityFormView['icon'];
  error?: string;
}) {
  return (
    <Field label={icon.label} error={error}>
      <RadioGroup
        value={icon.value}
        onValueChange={icon.choose}
        disabled={icon.disabled}
        // Two columns at any width: the sheet stays narrow on a wide screen too.
        className="grid grid-cols-2 gap-x-6"
      >
        {icon.options.map((option, index) => (
          <Field
            key={option.value}
            orientation="horizontal"
            label={
              <span className="flex items-center gap-2">
                <AmenityIcon icon={option.value} />
                {option.label}
              </span>
            }
          >
            <RadioGroupItem value={option.value} ref={index === 0 ? icon.ref : undefined} />
          </Field>
        ))}
      </RadioGroup>
    </Field>
  );
}
