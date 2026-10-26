import type { Customer } from '@masaha/shared/customers';
import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { findToast } from '../../../../test/findToast';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { ArchiveDialog } from '../../components/archive/ArchiveDialog';
import { useArchiveFlow } from './useArchiveFlow';

const SARA: Customer = { id: 4, name: 'Sara Khalid', phone: null, archivedAt: null };

/** A line with the Unicode isolates around its values removed, as a reader hears it. */
const heard = (expected: string) => (content: string) => content.replace(/[⁦-⁩]/g, '') === expected;

type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];

/** A customer's archive and restore, as a menu and a row would show them. */
function Harness({
  customer,
  debtAgorot,
  owner,
}: {
  customer: Customer;
  debtAgorot: number;
  owner: boolean;
}) {
  const flow = useArchiveFlow({ spaceId: 7, customer, debtAgorot, owner });
  return (
    <>
      {flow.archive !== null && (
        <button type="button" onClick={flow.archive.run}>
          {flow.archive.label}
        </button>
      )}
      {flow.restore !== null && (
        <button type="button" onClick={flow.restore.run}>
          {flow.restore.label}
        </button>
      )}
      <ArchiveDialog dialog={flow.dialog} />
    </>
  );
}

function renderFlow(
  answer: (request: Request) => FakeAnswer,
  { customer = SARA, debtAgorot = 0, owner = true } = {},
) {
  const requests = fakeTransport(answer);
  render(
    <QueryClientProvider client={createQueryClient()}>
      <Harness customer={customer} debtAgorot={debtAgorot} owner={owner} />
      <Toaster label="Notifications" />
    </QueryClientProvider>,
  );
  return requests;
}

const urls = (requests: Request[]) =>
  requests.filter(({ method }) => method === 'post').map(({ url }) => url);

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
});

describe('useArchiveFlow', () => {
  it('archives a settled customer at once, with «Undo» restoring them', async () => {
    const user = userEvent.setup();
    const requests = renderFlow((request) =>
      ok({ ...SARA, archivedAt: request.url?.endsWith('/archive') === true ? 'now' : null }),
    );

    await user.click(screen.getByRole('button', { name: 'Archive…' }));
    await findToast(heard('Sara Khalid archived'));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    // Sonner's action pressed by its key: jsdom has no pointer capture.
    screen.getByRole('button', { name: 'Undo' }).focus();
    await user.keyboard('{Enter}');
    await findToast(heard('Sara Khalid restored'));

    expect(urls(requests)).toEqual([
      '/manage/spaces/7/customers/4/archive',
      '/manage/spaces/7/customers/4/restore',
    ]);
    expect(requests.map(({ headers }) => headers.get('Idempotency-Key'))).toEqual([
      undefined,
      undefined,
    ]);
  });

  it('asks first for a customer who owes, naming the debt', async () => {
    const user = userEvent.setup();
    const requests = renderFlow(() => ok({ ...SARA, archivedAt: 'now' }), { debtAgorot: 5000 });

    await user.click(screen.getByRole('button', { name: 'Archive…' }));
    const dialog = await screen.findByRole('alertdialog', { name: heard('Archive Sara Khalid?') });
    expect(
      within(dialog).getByText(
        heard(
          'They owe ₪50. The amount stays on their record; they leave the search and the desk, and stay under “Archived” in Customers.',
        ),
      ),
    ).toBeVisible();
    expect(urls(requests)).toEqual([]);

    await user.click(within(dialog).getByRole('button', { name: 'Archive anyway' }));
    await findToast(heard('Sara Khalid archived · owes ₪50'));
    expect(urls(requests)).toEqual(['/manage/spaces/7/customers/4/archive']);
    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).toBeNull();
    });
  });

  it('says a customer present is checked out first', async () => {
    const user = userEvent.setup();
    renderFlow(() => refused(409, { type: 'conflict', code: 'MEMBER_ALREADY_CHECKED_IN' }), {
      debtAgorot: 5000,
    });

    await user.click(screen.getByRole('button', { name: 'Archive…' }));
    await user.click(await screen.findByRole('button', { name: 'Archive anyway' }));
    const alert = await within(screen.getByRole('alertdialog')).findByRole('alert');
    expect(alert.textContent.replace(/[⁦-⁩]/g, '')).toContain(
      'Sara Khalid is here now; check them out before archiving.',
    );
  });

  it('says a restore refused for a phone another customer now holds', async () => {
    const user = userEvent.setup();
    renderFlow(() => refused(409, { type: 'conflict', code: 'PHONE_TAKEN' }), {
      customer: { ...SARA, archivedAt: '2026-10-20T08:00:00Z' },
    });

    expect(screen.queryByRole('button', { name: 'Archive…' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Restore' }));
    await findToast('We couldn’t restore them');
    expect(
      await screen.findByText(
        'Their number now belongs to another customer; change one of them before restoring.',
      ),
    ).toBeVisible();
  });

  it('offers reception neither the archive nor the restore', () => {
    renderFlow(() => ok(SARA), { owner: false });
    expect(screen.queryByRole('button', { name: 'Archive…' })).toBeNull();
    renderFlow(() => ok(SARA), {
      owner: false,
      customer: { ...SARA, archivedAt: '2026-10-20T08:00:00Z' },
    });
    expect(screen.queryByRole('button', { name: 'Restore' })).toBeNull();
  });
});
