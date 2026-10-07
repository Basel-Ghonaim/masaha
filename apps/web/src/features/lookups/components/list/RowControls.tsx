import { ArrowDownIcon, ArrowUpIcon, Button } from '@shared/design-system';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import type { RowControlsView } from '../../types/RowControlsView';
import { RowSwitch } from './RowSwitch';

type Which = 'up' | 'down' | 'shown';

/**
 * A row's controls, for a governorate, an area or an amenity: its two arrows, its other switches (an
 * amenity's filter switch), its shown switch, then its edit sheet (`children`). A control that waits
 * on the server stays in the focus order and ignores presses, so the keyboard keeps its place; and
 * when a move carries the row elsewhere and the focus falls to the page, it comes back to the control
 * pressed, or to the row's next one that can take it.
 */
export function RowControls({
  controls,
  children,
}: {
  controls: RowControlsView;
  children: ReactNode;
}) {
  const up = useRef<HTMLButtonElement>(null);
  const down = useRef<HTMLButtonElement>(null);
  const shown = useRef<HTMLButtonElement>(null);
  const pressed = useRef<Which | null>(null);

  useLayoutEffect(() => {
    if (pressed.current === null) return;
    const order = { up: [up, down, shown], down: [down, up, shown], shown: [shown, up, down] };
    const candidates = order[pressed.current].map((ref) => ref.current);
    const active = document.activeElement;
    if (candidates.some((control) => control === active)) return;
    if (active !== null && active !== document.body) {
      // The focus went elsewhere by the user's hand: the row lets it go.
      pressed.current = null;
      return;
    }
    candidates.find((control) => control && !control.disabled)?.focus();
  });

  const press = (which: Which, act: () => void) => {
    pressed.current = which;
    if (!controls[which].waiting) act();
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      <Button
        ref={up}
        type="button"
        variant="ghost"
        size="icon"
        aria-label={controls.up.label}
        disabled={controls.up.disabled}
        aria-disabled={controls.up.waiting || undefined}
        onClick={() => {
          press('up', controls.up.move);
        }}
      >
        <ArrowUpIcon aria-hidden />
      </Button>
      <Button
        ref={down}
        type="button"
        variant="ghost"
        size="icon"
        aria-label={controls.down.label}
        disabled={controls.down.disabled}
        aria-disabled={controls.down.waiting || undefined}
        onClick={() => {
          press('down', controls.down.move);
        }}
      >
        <ArrowDownIcon aria-hidden />
      </Button>
      {controls.switches?.map((control) => (
        <RowSwitch
          key={control.label}
          control={control}
          onToggle={(checked) => {
            if (!control.waiting) control.toggle(checked);
          }}
        />
      ))}
      <RowSwitch
        ref={shown}
        control={controls.shown}
        onToggle={(checked) => {
          press('shown', () => {
            controls.shown.toggle(checked);
          });
        }}
      />
      {children}
    </div>
  );
}
