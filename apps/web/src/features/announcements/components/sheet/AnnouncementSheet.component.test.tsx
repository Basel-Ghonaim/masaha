import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { fakeTransport, restoreTransport } from '../../../../test/fakeTransport';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { startPreferences } from '../../../../test/startPreferences';
import type { SheetEntry } from '../../types/SheetEntry';
import { AnnouncementSheet } from './AnnouncementSheet';

function renderSheet(entry: SheetEntry) {
  fakeTransport(() => new Promise(() => undefined));
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <AnnouncementSheet
        spaceId={7}
        entry={entry}
        showTab={vi.fn()}
        returnFocus={() => null}
        onClose={vi.fn()}
      />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  startPreferences('en');
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['Date'] });
  // 10:00 in Gaza, 21 October 2026.
  vi.setSystemTime(new Date('2026-10-21T07:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('AnnouncementSheet', () => {
  it('focuses the checked type first, says a closure’s line, and previews the space’s page; axe-clean', async () => {
    stubScreenWidth(390);
    renderSheet({ mode: 'new', type: 'CLOSURE' });

    const sheet = screen.getByRole('dialog', { name: 'New announcement' });
    await waitFor(() => {
      expect(within(sheet).getByRole('radio', { name: /^Temporary closure/ })).toHaveFocus();
    });
    expect(
      within(sheet).getByText(
        'Visitors see the space as “Closed now” for this whole period, and the desk is warned at check-in.',
      ),
    ).toBeInTheDocument();

    // The preview draws the closure's notice, as the space's page will, from what is typed.
    const preview = within(sheet).getByRole('region', {
      name: 'Preview — the space’s public page',
    });
    await userEvent.type(within(sheet).getByRole('textbox', { name: 'Text in Arabic' }), 'مغلق');
    const notice = within(preview).getByRole('status');
    expect(notice).toHaveTextContent('مغلق');
    expect(notice.textContent.replace(/[⁦-⁩]/g, '')).toContain(
      'An announcement from the space · 21 October 10:00–18:00',
    );

    expect(await axe(document.body)).toHaveNoViolations();
  });

  it('previews any other type as the page’s item, with its type', async () => {
    stubScreenWidth(1440);
    renderSheet({ mode: 'new' });

    const preview = screen.getByRole('region', { name: 'Preview — the space’s public page' });
    expect(within(preview).getByText('General')).toBeInTheDocument();
    expect(within(preview).queryByRole('status')).toBeNull();
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it('marks Gaza’s today in its calendar, not the browser’s', async () => {
    // 22:30 UTC on 21 October: past midnight in Gaza, so Gaza’s today is the 22nd while a browser west
    // of Gaza, or on UTC, is still on the 21st.
    vi.setSystemTime(new Date('2026-10-21T22:30:00.000Z'));
    const user = userEvent.setup();
    renderSheet({ mode: 'new' });

    const ends = screen.getByRole('radiogroup', { name: 'Ends' });
    expect(within(ends).getByRole('radio', { name: 'At a time' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: /^Date/ }));
    const today = (await screen.findByRole('grid')).querySelector('[aria-current="date"]');
    expect(today).toHaveAttribute('data-day', '2026-10-22');
  });
});
