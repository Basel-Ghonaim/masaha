import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import type { SubscriberCheckInView } from '../../hooks/subscriber/useSubscriberCheckIn';
import { PreCheckInDialog } from './PreCheckInDialog';

function dialogView(change: Partial<SubscriberCheckInView['dialog']> = {}) {
  return {
    open: true,
    title: 'Check in · Sara Khalid',
    reason: 'The subscription “Exams” ended on 21 October.',
    asVisit: {
      label: 'Check in as a visit',
      note: 'A visit is recorded under their name; it isn’t added to their file.',
      run: vi.fn(),
    },
    anyway: { label: 'Check in anyway', run: vi.fn() },
    back: { label: 'Back', run: vi.fn() },
    busy: false,
    failure: null,
    ...change,
  };
}

describe('PreCheckInDialog', () => {
  it('is named by its title and described by its reason; «Check in as a visit» focused first; axe-clean', async () => {
    const anyway = vi.fn();
    const view = dialogView({ anyway: { label: 'Check in anyway', run: anyway } });
    render(<PreCheckInDialog dialog={view} focusAfter={() => null} />);

    const dialog = screen.getByRole('dialog', { name: 'Check in · Sara Khalid' });
    expect(dialog).toHaveAccessibleDescription('The subscription “Exams” ended on 21 October.');
    expect(screen.getByRole('button', { name: 'Check in as a visit' })).toHaveFocus();
    expect(await axe(dialog)).toHaveNoViolations();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Check in anyway' }));
    expect(anyway).toHaveBeenCalledTimes(1);
  });

  it('offers no «Check in anyway» with no subscription', () => {
    render(
      <PreCheckInDialog
        dialog={dialogView({ reason: 'No subscription.', anyway: null })}
        focusAfter={() => null}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Check in anyway' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Back' })).toBeVisible();
  });
});
