import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ToggleGroup,
  ToggleGroupItem,
  useMediaQuery,
  XIcon,
} from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import { LIVE_STATUSES, type LiveStatus } from '@masaha/shared/occupancy';
import { useId } from 'react';
import { useLiveStatusControl } from '../hooks/status/useLiveStatusControl';

// The trigger takes the colour of what visitors see (P2).
const TONES = {
  success: 'border-success bg-success-subtle text-success-subtle-foreground',
  warning: 'border-warning bg-warning-subtle text-warning-subtle-foreground',
  neutral: 'border-border bg-secondary text-secondary-foreground',
} as const;

const isLiveStatus = (value: string): value is LiveStatus =>
  LIVE_STATUSES.some((state) => state === value);

/**
 * The live status visitors see, and the control that sets it by hand (P2): one button in the state's
 * colour, the whole line from 768 px and the state's word alone below it, always named by the whole
 * line. It opens a panel: the three states, then how long — 30 minutes, an hour, two hours or until
 * closing — and, while an override is in force, the way back to the automatic status. While the
 * space is closed now, it is disabled and says why beside it.
 */
export function LiveStatusControl({ spaceId }: { spaceId: number }) {
  const control = useLiveStatusControl(spaceId);
  const wide = useMediaQuery('(min-width: 768px)');
  const titleId = useId();
  const forId = useId();
  const { trigger, panel } = control;

  return (
    <div className="flex items-center gap-2">
      <Popover open={control.open} onOpenChange={control.setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={TONES[trigger.tone]}
            aria-label={trigger.name}
            disabled={trigger.disabled}
          >
            {wide ? trigger.label : trigger.word}
          </Button>
        </PopoverTrigger>
        <PopoverContent aria-labelledby={titleId} className="flex w-72 flex-col gap-3">
          <p id={titleId} className="text-label">
            {panel.title}
          </p>
          {panel.now !== null && <p className="text-body-sm">{panel.now}</p>}
          <ToggleGroup
            type="single"
            aria-labelledby={titleId}
            value={panel.state}
            onValueChange={(value) => {
              if (isLiveStatus(value)) panel.choose(value);
            }}
            disabled={panel.busy}
          >
            {panel.states.map((state) => (
              <ToggleGroupItem key={state.value} value={state.value}>
                {state.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <p id={forId} className="text-body-sm text-muted-foreground">
            {panel.forLabel}
          </p>
          <div role="group" aria-labelledby={forId} className="grid grid-cols-2 gap-2">
            {panel.durations.map((duration) => (
              <Button
                key={duration.value}
                variant="outline"
                disabled={panel.busy}
                onClick={() => void duration.run()}
              >
                {duration.label}
              </Button>
            ))}
          </div>
          {panel.back !== null && (
            <Button variant="ghost" disabled={panel.busy} onClick={() => void panel.back?.run()}>
              <XIcon aria-hidden />
              {panel.back.label}
            </Button>
          )}
          <p className="text-caption text-muted-foreground">{panel.note}</p>
          {panel.failure !== null && <FormFailure view={panel.failure} />}
        </PopoverContent>
      </Popover>
      {trigger.reason !== null && (
        <span className="text-caption text-muted-foreground">{trigger.reason}</span>
      )}
    </div>
  );
}
