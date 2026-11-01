import type { StalenessThresholds } from '@masaha/shared/platform-settings';
import { Field, Input } from '@shared/design-system';
import { useStalenessCard } from '../../hooks/admin/useStalenessCard';
import { SettingsCardShell } from './SettingsCardShell';

/** «حداثة البيانات»: the prices' days and the other data's, side by side from 768 px. */
export function StalenessCard({ saved }: { saved: StalenessThresholds }) {
  const card = useStalenessCard(saved);
  return (
    <SettingsCardShell frame={card.frame}>
      <div className="grid items-start gap-5 md:grid-cols-2">
        {[card.prices, card.other].map((field) => (
          <Field key={field.label} label={field.label} error={field.error}>
            <Input dir="ltr" inputMode="numeric" autoComplete="off" {...field.binding} />
          </Field>
        ))}
      </div>
    </SettingsCardShell>
  );
}
