import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useRowTriggers } from './useRowTriggers';

type Triggers = ReturnType<typeof useRowTriggers>;

/** A row's menu button, drawn as a card's or a table row's: the same person, another element. */
function Rows({ as, onTriggers }: { as: 'card' | 'row'; onTriggers: (t: Triggers) => void }) {
  const triggers = useRowTriggers();
  onTriggers(triggers);
  return (
    <ul>
      {[7, 9].map((id) => (
        <li key={`${as}-${String(id)}`}>
          <button type="button" ref={triggers.register(id)}>
            {`Actions for ${String(id)} (${as})`}
          </button>
        </li>
      ))}
    </ul>
  );
}

describe('useRowTriggers', () => {
  it('the row’s trigger takes the focus back when its dialog closes, though the row was drawn again', () => {
    let triggers: Triggers | undefined;
    const keep = (t: Triggers) => {
      triggers = t;
    };
    const { rerender } = render(<Rows as="row" onTriggers={keep} />);
    // The dialog opened from person 7's row holds the ref; the row becomes a card meanwhile.
    const returnTo = triggers?.focusOf(7);
    rerender(<Rows as="card" onTriggers={keep} />);

    returnTo?.current?.focus();

    expect(screen.getByRole('button', { name: 'Actions for 7 (card)' })).toHaveFocus();
  });

  it('reads no trigger for a row that is gone', () => {
    let triggers: Triggers | undefined;
    const { unmount } = render(
      <Rows
        as="row"
        onTriggers={(t) => {
          triggers = t;
        }}
      />,
    );
    const returnTo = triggers?.focusOf(9);

    unmount();

    expect(returnTo?.current).toBeNull();
  });
});
