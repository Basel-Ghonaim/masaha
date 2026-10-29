import type { SpaceReport } from '@masaha/shared/data-reports';
import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { adminReport, spaceReport } from '../../../../test/dataReport';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { findToast } from '../../../../test/findToast';
import {
  bodyOf,
  fakeTransport,
  ok,
  refused,
  restoreTransport,
} from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { DecideSheet } from '../../components/decide/DecideSheet';
import type { DecideTarget } from '../../types/DecideTarget';

const DECIDED: SpaceReport = spaceReport({
  status: 'RESOLVED',
  decision: { status: 'RESOLVED', at: '2026-10-27T09:00:00.000Z', note: null, repliedBy: 'SPACE' },
});

/**
 * The sheet of `report`, open until it closes itself, as the owner's list holds it — or as `target`
 * says, the admin's.
 */
function renderSheet(
  answer: () => FakeAnswer | Promise<FakeAnswer> = () => ok(DECIDED),
  report: SpaceReport = spaceReport(),
  target: DecideTarget = { audience: 'owner', spaceId: 7, report },
  editLink = '/dashboard/spaces/7/profile#hours',
) {
  const requests = fakeTransport(answer);
  const onClose = vi.fn();
  const showDecided = vi.fn();
  const client = createQueryClient();
  const invalidated = vi.spyOn(client, 'invalidateQueries');
  function Opened() {
    const [open, setOpen] = useState(true);
    return open ? (
      <DecideSheet
        target={target}
        editLink={editLink}
        showDecided={showDecided}
        onClose={() => {
          onClose();
          setOpen(false);
        }}
        returnFocus={() => null}
      />
    ) : null;
  }
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Opened />
      </MemoryRouter>
      <Toaster label="Notifications" />
    </QueryClientProvider>,
  );
  return { requests, onClose, showDecided, invalidated };
}

/** The scopes read again, by their keys. */
const keysOf = (invalidated: MockInstance<QueryClient['invalidateQueries']>) =>
  invalidated.mock.calls.map(([filters]) => filters?.queryKey);

const reply = () => screen.getByRole('textbox', { name: 'Reply from the space' });

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
});

describe('useDecideSheet', () => {
  it('focuses a blank «Not accepted» reply with its line, and sends nothing', async () => {
    const user = userEvent.setup();
    const { requests, onClose } = renderSheet();
    await screen.findByRole('dialog', { name: 'Report about Opening hours' });
    expect(reply()).toHaveAccessibleDescription(
      'Shown to the person who reported it. Required for “Not accepted”, optional for “Corrected”.',
    );

    await user.type(reply(), '   ');
    await user.click(screen.getByRole('button', { name: 'Not accepted' }));

    await waitFor(() => {
      expect(reply()).toHaveFocus();
    });
    expect(reply()).toHaveAccessibleDescription(
      expect.stringContaining('Write the reason; it’s what the reporter will read.'),
    );
    expect(requests).toEqual([]);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('sends «Corrected» with no reply as its status alone, once, and says where the report went', async () => {
    const user = userEvent.setup();
    let answer: (value: FakeAnswer) => void = () => undefined;
    const { requests, onClose, showDecided, invalidated } = renderSheet(
      () =>
        new Promise<FakeAnswer>((resolve) => {
          answer = resolve;
        }),
    );
    await screen.findByRole('dialog');

    const resolve = screen.getByRole('button', { name: 'Corrected' });
    await user.click(resolve);
    await user.click(resolve);
    await user.click(screen.getByRole('button', { name: 'Not accepted' }));
    await waitFor(() => {
      expect(requests).toHaveLength(1);
    });
    expect(requests[0]?.method).toBe('patch');
    expect(requests[0]?.url).toBe('/manage/spaces/7/data-reports/41');
    expect(bodyOf(requests[0])).toEqual({ status: 'RESOLVED' });

    answer(ok(DECIDED));
    const toast = await findToast('Marked “Corrected”');
    expect(onClose).toHaveBeenCalledTimes(1);
    const shown = toast.closest('li') ?? document.body;
    expect(within(shown).getByText('In “Reviewed”')).toBeVisible();
    expect(within(shown).queryByText('The reply is shown to the reporter.')).toBeNull();
    // Sonner's swipe needs pointer capture, which jsdom lacks: the action is pressed by its key.
    within(shown).getByRole('button', { name: 'Show' }).focus();
    await user.keyboard('{Enter}');
    expect(showDecided).toHaveBeenCalledTimes(1);
    expect(keysOf(invalidated)).toEqual([['space', 7, 'dataReports']]);
    expect(requests).toHaveLength(1);
  });

  it('sends «Not accepted» with its reply, and says the reply reached the reporter', async () => {
    const user = userEvent.setup();
    const { requests } = renderSheet(() =>
      ok({
        ...DECIDED,
        status: 'DISMISSED',
        decision: { ...DECIDED.decision, status: 'DISMISSED' },
      }),
    );
    await screen.findByRole('dialog');

    await user.type(reply(), 'The hours are right');
    await user.click(screen.getByRole('button', { name: 'Not accepted' }));

    const toast = await findToast('Marked “Not accepted”');
    expect(bodyOf(requests[0])).toEqual({ status: 'DISMISSED', note: 'The hours are right' });
    expect(
      within(toast.closest('li') as HTMLElement).getByText('The reply is shown to the reporter.'),
    ).toBeVisible();
  });

  it('words REPORT_ALREADY_DECIDED, reads the list again and takes no decision then', async () => {
    const user = userEvent.setup();
    const { invalidated, onClose } = renderSheet(() =>
      refused(409, { type: 'conflict', code: 'REPORT_ALREADY_DECIDED' }),
    );
    await screen.findByRole('dialog');

    await user.type(reply(), 'Fixed');
    await user.click(screen.getByRole('button', { name: 'Corrected' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('This report was already decided.');
    expect(keysOf(invalidated)).toEqual([['space', 7, 'dataReports']]);
    expect(screen.queryByRole('button', { name: 'Corrected' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Not accepted' })).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows a decided report read-only: its decision and its reply, or «No reply», no buttons', async () => {
    const { requests } = renderSheet(
      undefined,
      spaceReport({
        status: 'DISMISSED',
        decision: {
          status: 'DISMISSED',
          at: '2026-10-27T09:00:00.000Z',
          note: 'The hours are right',
          repliedBy: 'SPACE',
        },
      }),
    );
    const sheet = await screen.findByRole('dialog');

    expect(within(sheet).getByText('Not accepted')).toBeVisible();
    expect(within(sheet).getByText('Decision')).toBeVisible();
    expect(
      within(sheet).getByText(
        (text) => text.replace(/[⁦-⁩]/g, '') === 'Reply: The hours are right',
      ),
    ).toBeVisible();
    expect(within(sheet).queryByRole('textbox')).toBeNull();
    expect(within(sheet).queryByRole('button', { name: 'Corrected' })).toBeNull();
    expect(within(sheet).queryByRole('button', { name: 'Not accepted' })).toBeNull();
    expect(requests).toEqual([]);
  });

  it('says «No reply» for a decision without one', async () => {
    renderSheet(undefined, DECIDED);

    expect(await screen.findByText('No reply')).toBeVisible();
  });

  it('words a 403 as the space no longer open, and reads the user’s spaces again', async () => {
    const user = userEvent.setup();
    const { invalidated } = renderSheet(() => refused(403, { type: 'forbidden' }));
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('button', { name: 'Corrected' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This is no longer open to you at this space.',
    );
    expect(keysOf(invalidated)).toEqual([['me']]);
    expect(screen.getByRole('button', { name: 'Corrected' })).toBeVisible();
  });

  it('words a report gone, and reads the list and the user’s spaces again', async () => {
    const user = userEvent.setup();
    const { invalidated } = renderSheet(() => refused(404, { type: 'not_found' }));
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('button', { name: 'Corrected' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('This report no longer exists.');
    expect(keysOf(invalidated)).toEqual([['space', 7, 'dataReports'], ['me']]);
    expect(screen.queryByRole('button', { name: 'Corrected' })).toBeNull();
  });

  it('says a lost answer is safe to retry, the reply kept, and sends it again on «Try again»', async () => {
    const user = userEvent.setup();
    let calls = 0;
    const { requests } = renderSheet(() => {
      calls += 1;
      return calls === 1 ? { failure: 'ERR_NETWORK' } : ok(DECIDED);
    });
    await screen.findByRole('dialog');

    await user.type(reply(), 'Fixed');
    await user.click(screen.getByRole('button', { name: 'Corrected' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'No answer came back. Try again — the same decision isn’t recorded twice.',
    );
    expect(reply()).toHaveValue('Fixed');
    await user.click(within(alert).getByRole('button', { name: 'Try again' }));

    await findToast('Marked “Corrected”');
    expect(requests.map(bodyOf)).toEqual([
      { status: 'RESOLVED', note: 'Fixed' },
      { status: 'RESOLVED', note: 'Fixed' },
    ]);
  });

  it('names the reporter to the admin, and sends an unverified space’s decision as the admin’s', async () => {
    const user = userEvent.setup();
    const report = adminReport();
    const { requests, invalidated } = renderSheet(
      () => ok({ ...report, status: 'RESOLVED' }),
      report,
      { audience: 'admin', report },
      '/dashboard/admin/spaces/7#hours',
    );

    const sheet = await screen.findByRole('dialog', { name: 'Report about Opening hours' });
    expect(
      within(sheet).getByText((text) => text.replace(/[⁦-⁩]/g, '') === 'Huda Saleh · 21 October'),
    ).toBeVisible();
    expect(within(sheet).getByRole('link', { name: 'Edit the field' })).toHaveAttribute(
      'href',
      '/dashboard/admin/spaces/7#hours',
    );
    await user.type(screen.getByRole('textbox', { name: 'Reply from our team' }), 'Fixed');
    await user.click(screen.getByRole('button', { name: 'Corrected' }));

    await findToast('Marked “Corrected”');
    expect(requests.map(({ method, url }) => `${String(method)} ${String(url)}`)).toEqual([
      'patch /admin/data-reports/41',
    ]);
    expect(bodyOf(requests[0])).toEqual({ status: 'RESOLVED', note: 'Fixed' });
    expect(keysOf(invalidated)).toEqual([['admin', 'dataReports']]);
  });

  it('shows the admin a verified space’s report read-only, with a link to the space', async () => {
    const report = adminReport({
      space: { id: 3, slug: 'nook', nameEn: 'Nook', nameAr: null, verified: true },
    });
    const { requests } = renderSheet(
      undefined,
      report,
      { audience: 'admin', report },
      '/dashboard/admin/spaces/3',
    );

    const sheet = await screen.findByRole('dialog');
    expect(
      within(sheet).getByText(
        'Verified space — its owner decides this report. For reference only.',
      ),
    ).toBeVisible();
    expect(within(sheet).getByRole('link', { name: 'View the space' })).toHaveAttribute(
      'href',
      '/dashboard/admin/spaces/3',
    );
    expect(within(sheet).queryByRole('link', { name: 'Edit the field' })).toBeNull();
    expect(within(sheet).queryByRole('textbox')).toBeNull();
    expect(within(sheet).queryByRole('button', { name: 'Corrected' })).toBeNull();
    expect(within(sheet).queryByRole('button', { name: 'Not accepted' })).toBeNull();
    expect(requests).toEqual([]);
  });

  it('words the admin’s 403 as a space verified meanwhile, and reads the admin’s reports again', async () => {
    const user = userEvent.setup();
    const report = adminReport();
    const { invalidated } = renderSheet(() => refused(403, { type: 'forbidden' }), report, {
      audience: 'admin',
      report,
    });
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('button', { name: 'Corrected' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This space is verified: its owner decides this report.',
    );
    expect(keysOf(invalidated)).toEqual([['admin', 'dataReports']]);
    expect(screen.queryByRole('button', { name: 'Corrected' })).toBeNull();
  });
});
