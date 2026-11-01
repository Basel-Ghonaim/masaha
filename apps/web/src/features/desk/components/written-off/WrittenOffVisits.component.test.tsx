import type { WrittenOffVisit } from '@masaha/shared/visits';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { deskVisit, uncollectedPage, uncollectedVisit } from '../../../../test/deskVisit';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { findToast } from '../../../../test/findToast';
import { startPreferences } from '../../../../test/startPreferences';
import { Toaster } from '@shared/design-system';
import { UncollectedCard } from '../uncollected/UncollectedCard';

/** A line with the Unicode isolates around its values removed, as a reader hears it. */
const heard = (expected: string) => (content: string) => content.replace(/[⁦-⁩]/g, '') === expected;

/** «Khalid»'s visit, written off by Huda on 7 October: ₪25 forgiven, nothing paid; a customer's. */
function writtenOff(change: Partial<WrittenOffVisit> = {}): WrittenOffVisit {
  return {
    visit: deskVisit({
      id: 3,
      visitorName: 'Khalid',
      customer: { id: 40, name: 'Khalid Nasser', phone: null },
      checkedInAt: '2026-10-06T11:00:00.000Z',
      checkedOutAt: '2026-10-06T19:00:00.000Z',
      checkoutMethod: 'AUTO',
      writeOff: { at: '2026-10-07T09:00:00.000Z', byId: 2, reason: 'Left the country' },
    }),
    writtenOffBy: { id: 2, name: 'Huda' },
    paidAgorot: 0,
    writtenOffAgorot: 2500,
    ...change,
  };
}

type Answer = Parameters<typeof fakeTransport>[0];

function renderCard(answer: Answer, owner = true) {
  const requests = fakeTransport(answer);
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={['/desk']}>
        <UncollectedCard
          spaceId={7}
          abilities={{ writeOff: owner }}
          fileLink={(id) => `/file/${String(id)}`}
        />
      </MemoryRouter>
      <Toaster label="Notifications" />
    </QueryClientProvider>,
  );
  return requests;
}

const lists = (written: WrittenOffVisit[]) => (config: { method?: string; url?: string }) =>
  config.url === '/manage/spaces/7/written-off-visits'
    ? uncollectedPage(written as never)
    : uncollectedPage([uncollectedVisit({ id: 4, visitorName: 'Rami' })]);

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  vi.unstubAllGlobals();
  restoreTransport();
});

describe('the owner’s written-off visits', () => {
  it('lists who, when, how much and why, by whom, with «Undo», and is axe-clean', async () => {
    const user = userEvent.setup();
    renderCard(lists([writtenOff()]));

    await user.click(await screen.findByRole('radio', { name: 'Written off' }));

    const name = await screen.findByRole('link', { name: 'Khalid Nasser' });
    expect(name).toHaveAttribute('href', '/file/40');
    const row = name.closest('li') as HTMLElement;
    expect(within(row).getByText(heard('Written off ₪25 · Left the country'))).toBeVisible();
    expect(within(row).getByText(heard('Written off by Huda on 7 October'))).toBeVisible();
    // Named by its visit, so a list of them reads apart; «Undo» is what it shows.
    const undo = within(row).getByRole('button', {
      name: heard('Undo writing off Khalid Nasser’s visit · 6 October'),
    });
    expect(undo).toHaveTextContent('Undo');
    expect(screen.queryByText('Rami')).toBeNull();
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it('names each «تراجع» by its visit in Arabic', async () => {
    startPreferences('ar');
    const user = userEvent.setup();
    renderCard(lists([writtenOff()]));

    await user.click(await screen.findByRole('radio', { name: 'لن تُحصَّل' }));

    expect(
      await screen.findByRole('button', {
        name: heard('تراجع عن شطب زيارة Khalid Nasser · 6 أكتوبر'),
      }),
    ).toHaveTextContent('تراجع');
  });

  it('says none was written off', async () => {
    const user = userEvent.setup();
    renderCard(lists([]));

    await user.click(await screen.findByRole('radio', { name: 'Written off' }));

    expect(await screen.findByText('No visit was written off.')).toBeVisible();
  });

  it('undoes once, says so and reads both views again', async () => {
    const user = userEvent.setup();
    let undone = false;
    const requests = renderCard((config) => {
      if (config.method === 'delete') {
        undone = true;
        return ok(deskVisit({ id: 3 }));
      }
      return lists(undone ? [] : [writtenOff()])(config);
    });

    await user.click(await screen.findByRole('radio', { name: 'Written off' }));
    await user.click(await screen.findByRole('button', { name: /^Undo writing off/ }));

    await findToast('The visit is back in “Not collected”');
    expect(await screen.findByText('No visit was written off.')).toBeVisible();
    const deletes = requests.filter((request) => request.method === 'delete');
    expect(deletes.map((request) => request.url)).toEqual(['/manage/spaces/7/visits/3/write-off']);
    expect(deletes[0]?.headers.get('Idempotency-Key')).toBeUndefined();
    await waitFor(() => {
      expect(
        requests.filter((request) => request.url === '/manage/spaces/7/uncollected-visits'),
      ).toHaveLength(2);
    });
  });

  it('sends a failed undo once and never again by itself', async () => {
    const user = userEvent.setup();
    const requests = renderCard((config) =>
      config.method === 'delete' ? { failure: 'ERR_NETWORK' } : lists([writtenOff()])(config),
    );

    await user.click(await screen.findByRole('radio', { name: 'Written off' }));
    await user.click(await screen.findByRole('button', { name: /^Undo writing off/ }));

    await findToast('We couldn’t undo the write-off');
    expect(requests.filter((request) => request.method === 'delete')).toHaveLength(1);
  });

  it('is never offered to reception, nor read for it', async () => {
    const requests = renderCard(lists([writtenOff()]), false);

    expect(await screen.findByText('Rami')).toBeVisible();
    expect(screen.queryByRole('radio', { name: 'Written off' })).toBeNull();
    expect(requests.some((request) => request.url?.includes('written-off') === true)).toBe(false);
  });
});
