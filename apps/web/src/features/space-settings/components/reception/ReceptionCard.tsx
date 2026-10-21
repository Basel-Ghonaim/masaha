import type { SpaceSettings } from '@masaha/shared/space-settings';
import { Field, Switch } from '@shared/design-system';
import { useReceptionCard } from '../../hooks/reception/useReceptionCard';
import { SettingsCard } from '../SettingsCard';

/** «الاستقبال»: whether reception may type a price by hand, and what that allows. */
export function ReceptionCard({ spaceId, settings }: { spaceId: number; settings: SpaceSettings }) {
  const card = useReceptionCard({ spaceId, settings });
  const { typePrices } = card;

  return (
    <SettingsCard frame={card.frame}>
      <Field orientation="horizontal" label={typePrices.label} helper={typePrices.helper}>
        <Switch
          checked={typePrices.checked}
          disabled={typePrices.disabled}
          onCheckedChange={typePrices.toggle}
        />
      </Field>
    </SettingsCard>
  );
}
