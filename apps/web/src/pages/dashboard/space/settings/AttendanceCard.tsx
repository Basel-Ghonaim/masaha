import { SettingsCard } from '@features/space-settings';
import type { SpaceSettings } from '@masaha/shared/space-settings';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Field,
  Input,
  Skeleton,
  Switch,
} from '@shared/design-system';
import { useAttendanceCard } from './useAttendanceCard';
import { useAttendanceForm } from './useAttendanceForm';

/**
 * «الحضور والحالة المباشرة», the settings page's first card: the capacity, auto check-out at
 * closing and the stay limit in hours, in one form and one save (the owner's O2). While its values
 * load, a placeholder stands for it, its status heard; if the capacity cannot be read, an alert says
 * so, with «إعادة المحاولة»; settings that cannot be read are said by the cards below, once.
 */
export function AttendanceCard({ spaceId }: { spaceId: number }) {
  const card = useAttendanceCard(spaceId);

  if (card.status === 'loading') {
    return (
      <div role="status">
        <span className="sr-only">{card.label}</span>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (card.status === 'settingsFailed') return null;
  if (card.status === 'error') {
    const { failure } = card;
    return (
      <Alert variant="destructive">
        <AlertTitle>{failure.title}</AlertTitle>
        <AlertDescription>
          <p>{failure.message}</p>
          {failure.reference !== undefined && <p>{failure.reference}</p>}
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            disabled={failure.blocked}
            onClick={failure.retry}
          >
            {failure.retryLabel}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  return <AttendanceForm spaceId={spaceId} capacity={card.capacity} settings={card.settings} />;
}

function AttendanceForm({
  spaceId,
  capacity,
  settings,
}: {
  spaceId: number;
  capacity: number | null;
  settings: SpaceSettings;
}) {
  const form = useAttendanceForm(spaceId, capacity, settings);

  return (
    <SettingsCard frame={form.frame}>
      <Field
        label={form.capacity.label}
        labelEnd={
          <span className="text-caption text-muted-foreground">{form.capacity.optional}</span>
        }
        helper={form.capacity.helper}
        error={form.capacity.error}
      >
        <Input
          dir="ltr"
          inputMode="numeric"
          autoComplete="off"
          className="w-28"
          {...form.capacity.binding}
        />
      </Field>
      <Field orientation="horizontal" label={form.autoOut.label} helper={form.autoOut.helper}>
        <Switch
          checked={form.autoOut.checked}
          disabled={form.autoOut.disabled}
          onCheckedChange={form.autoOut.toggle}
        />
      </Field>
      <Field
        label={form.maxStay.label}
        labelEnd={
          <span className="text-caption text-muted-foreground">{form.maxStay.optional}</span>
        }
        helper={form.maxStay.helper}
        error={form.maxStay.error}
      >
        <Input
          dir="ltr"
          inputMode="numeric"
          autoComplete="off"
          className="w-28"
          {...form.maxStay.binding}
        />
      </Field>
    </SettingsCard>
  );
}
