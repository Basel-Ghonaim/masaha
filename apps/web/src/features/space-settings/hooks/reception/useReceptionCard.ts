import type { SpaceSettings } from '@masaha/shared/space-settings';
import { useCopy } from '@shared/copy';
import { useWatch } from 'react-hook-form';
import { useSettingsCard } from '../card/useSettingsCard';

type ReceptionValues = { receptionMayTypePrices: boolean };

const receptionValues = (settings: SpaceSettings): ReceptionValues => ({
  receptionMayTypePrices: settings.receptionMayTypePrices,
});

/**
 * The «الاستقبال» card, ready to render: one switch, whether reception may type a price by hand,
 * with what it allows and that the owner always may (design issue 14).
 */
export function useReceptionCard({
  spaceId,
  settings,
}: {
  spaceId: number;
  settings: SpaceSettings;
}) {
  const words = useCopy().spaceSettings.reception;
  const { frame, form } = useSettingsCard<ReceptionValues>({
    spaceId,
    settings,
    id: 'reception',
    title: words.title,
    valuesOf: receptionValues,
    fields: ['receptionMayTypePrices'],
    prepare: (values) => values,
  });
  const checked = useWatch({ control: form.form.control, name: 'receptionMayTypePrices' });

  return {
    frame,
    typePrices: {
      label: words.switch,
      helper: words.help,
      checked,
      disabled: form.isPending,
      toggle: (next: boolean) => {
        form.form.setValue('receptionMayTypePrices', next, { shouldDirty: true });
      },
    },
  };
}
