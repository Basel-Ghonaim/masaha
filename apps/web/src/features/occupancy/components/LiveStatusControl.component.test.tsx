import type { SpaceOccupancyNow } from '@masaha/shared/occupancy';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { fakeTransport, ok, restoreTransport } from '../../../test/fakeTransport';
import { stubScreenWidth } from '../../../test/screenWidth';
import { startPreferences } from '../../../test/startPreferences';
import { LiveStatusControl } from './LiveStatusControl';

const NOW: SpaceOccupancyNow = {
  status: 'AVAILABLE',
  capacity: 40,
  present: 0,
  override: null,
  people: [],
};

/** A name with the Unicode isolates around its inserted values removed, as a reader hears it. */
const heard = (expected: string) => (name: string) => name.replace(/[⁦-⁩]/g, '') === expected;

function renderControl(answer: SpaceOccupancyNow) {
  fakeTransport(() => ok(answer));
  render(
    <QueryClientProvider client={createQueryClient()}>
      <main>
        <LiveStatusControl spaceId={7} />
      </main>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('LiveStatusControl', () => {
  it('names the trigger with the full line at 390, though it shows the state word only', async () => {
    stubScreenWidth(390);
    renderControl(NOW);

    const trigger = await screen.findByRole('button', {
      name: heard('Visitors see: Available — change it'),
    });
    expect(trigger).toHaveTextContent(/^Available$/);
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it('shows the full line from 768 px, and opens the panel with the states and the durations', async () => {
    const user = userEvent.setup();
    stubScreenWidth(1440);
    renderControl(NOW);

    const trigger = await screen.findByRole('button', {
      name: heard('Visitors see: Available — change it'),
    });
    expect(trigger.textContent.replace(/[⁦-⁩]/g, '')).toBe('Visitors see: Available');
    await user.click(trigger);

    expect(
      await screen.findByRole('radiogroup', { name: 'What visitors see' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '30 min' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Until closing' })).toBeInTheDocument();
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it('is disabled while the space is closed, its reason beside it', async () => {
    stubScreenWidth(1440);
    renderControl({ ...NOW, status: 'CLOSED' });

    expect(
      await screen.findByRole('button', { name: heard('Visitors see: Closed now — change it') }),
    ).toBeDisabled();
    expect(
      screen.getByText('The status can’t be set while the space is closed.'),
    ).toBeInTheDocument();
  });
});
