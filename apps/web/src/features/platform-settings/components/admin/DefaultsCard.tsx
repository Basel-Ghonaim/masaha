import type { NewSpaceDefaults } from '@masaha/shared/space-settings';
import { Field, Input, RadioGroup, RadioGroupItem, Switch } from '@shared/design-system';
import { useDefaultsCard } from '../../hooks/admin/useDefaultsCard';
import { SettingsCardShell } from './SettingsCardShell';

/**
 * «الإعدادات الافتراضية للمساحات الجديدة»: the automatic check-out, the rounding — a choice of
 * three, the first with its minutes while chosen —, and the day price's cap.
 */
export function DefaultsCard({ saved }: { saved: NewSpaceDefaults }) {
  const card = useDefaultsCard(saved);
  const { rounding } = card;

  const toggle = (switched: typeof card.cap) => (
    <Field orientation="horizontal" label={switched.label}>
      <Switch
        checked={switched.checked}
        disabled={switched.disabled}
        onCheckedChange={switched.toggle}
      />
    </Field>
  );

  return (
    <SettingsCardShell frame={card.frame}>
      {toggle(card.autoCheckout)}
      <Field label={rounding.label}>
        <RadioGroup
          value={rounding.value}
          onValueChange={rounding.choose}
          disabled={rounding.disabled}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Field orientation="horizontal" label={rounding.upAfter}>
              <RadioGroupItem value="UP_AFTER_MINUTES" />
            </Field>
            {rounding.minutes !== null && (
              <div className="ps-7">
                <Field label={rounding.minutes.label} error={rounding.minutes.error}>
                  <Input
                    dir="ltr"
                    inputMode="numeric"
                    autoComplete="off"
                    className="w-20"
                    {...rounding.minutes.binding}
                  />
                </Field>
              </div>
            )}
          </div>
          <Field orientation="horizontal" label={rounding.half}>
            <RadioGroupItem value="NEAREST_HALF_HOUR" />
          </Field>
          <Field orientation="horizontal" label={rounding.minute}>
            <RadioGroupItem value="PER_MINUTE" />
          </Field>
        </RadioGroup>
      </Field>
      {toggle(card.cap)}
    </SettingsCardShell>
  );
}
