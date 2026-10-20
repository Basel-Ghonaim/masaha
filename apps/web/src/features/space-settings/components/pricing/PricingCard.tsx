import type { SpaceSettings } from '@masaha/shared/space-settings';
import { Field, Input, RadioGroup, RadioGroupItem, Switch } from '@shared/design-system';
import { Link } from 'react-router';
import { usePricingCard } from '../../hooks/pricing/usePricingCard';
import { SettingsCard } from '../SettingsCard';

/**
 * «تسعير الزيارات»: its description leads to Packages & prices (`pricesLink`), where the hour and
 * day prices are; then the rounding, a choice of three, the first with its minutes and its example
 * (design issue 16: the examples name no money), and the two switches.
 */
export function PricingCard({
  spaceId,
  settings,
  pricesLink,
}: {
  spaceId: number;
  settings: SpaceSettings;
  pricesLink: string;
}) {
  const card = usePricingCard({ spaceId, settings });
  const { rounding } = card;
  const { minutes } = rounding.upAfter;

  return (
    <SettingsCard
      frame={card.frame}
      description={
        <>
          {card.frame.description}{' '}
          <Link to={pricesLink} className="text-primary underline underline-offset-4">
            {card.pricesLink}
          </Link>
        </>
      }
    >
      <Field label={rounding.label}>
        <RadioGroup
          value={rounding.value}
          onValueChange={rounding.choose}
          disabled={rounding.disabled}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Field orientation="horizontal" label={rounding.upAfter.label}>
              <RadioGroupItem value="UP_AFTER_MINUTES" />
            </Field>
            <div className="flex flex-col gap-1 ps-7">
              <Field label={minutes.label} error={minutes.error}>
                <div className="flex items-center gap-2">
                  <Input
                    dir="ltr"
                    inputMode="numeric"
                    autoComplete="off"
                    className="w-20"
                    {...minutes.binding}
                  />
                  <span className="text-body-sm text-muted-foreground">{minutes.unit}</span>
                </div>
              </Field>
              {rounding.upAfter.example !== null && (
                <p className="text-caption text-muted-foreground" aria-live="polite">
                  {rounding.upAfter.example}
                </p>
              )}
            </div>
          </div>
          <Field orientation="horizontal" label={rounding.half.label} helper={rounding.half.hint}>
            <RadioGroupItem value="NEAREST_HALF_HOUR" />
          </Field>
          <Field
            orientation="horizontal"
            label={rounding.minute.label}
            helper={rounding.minute.hint}
          >
            <RadioGroupItem value="PER_MINUTE" />
          </Field>
        </RadioGroup>
      </Field>
      {[card.cap, card.students].map((toggle) => (
        <Field key={toggle.label} orientation="horizontal" label={toggle.label}>
          <Switch
            checked={toggle.checked}
            disabled={toggle.disabled}
            onCheckedChange={toggle.toggle}
          />
        </Field>
      ))}
    </SettingsCard>
  );
}
