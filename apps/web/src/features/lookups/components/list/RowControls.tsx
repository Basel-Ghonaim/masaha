import { ArrowDownIcon, ArrowUpIcon, Button } from '@shared/design-system';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { RowControlsView } from '../../types/RowControlsView';
import { RowSwitch } from './RowSwitch';

type Which = 'up' | 'down' | 'shown';

/**
 * A row's controls, for a governorate, an area or an amenity: its two arrows, its shown switch, then
 * its edit sheet (`children`). A control that waits
 * on the server stays in the focus order and ignores presses, so the keyboard keeps its place; and
 * when a move carries the row elsewhere and the focus falls to the page, it comes back to the control
 * pressed, or to the row's next one that can take it. Once an arrow's move has landed, a polite live
 * region says where the row now stands; a row that only made room says nothing.
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
  // The row's place as last seen, whether an arrow of it was pressed since, and what was said.
  const [seen, setSeen] = useState(controls.moved);
  const [moving, setMoving] = useState(false);
  const [said, setSaid] = useState('');
  if (controls.moved !== seen) {
    setSeen(controls.moved);
    if (moving) {
      setSaid(controls.moved);
      setMoving(false);
    }
  }

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
    if (controls[which].waiting) return;
    if (which !== 'shown') setMoving(true);
    act();
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
      <span role="status" className="sr-only">
        {said}
      </span>
    </div>
  );
}
