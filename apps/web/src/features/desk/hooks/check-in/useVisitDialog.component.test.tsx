import type { Shift } from '@masaha/shared/spaces';
import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { deskVisit, visitTerms } from '../../../../test/deskVisit';
import { findToast } from '../../../../test/findToast';
import { deferred } from '../../../../test/fakeSession';
import { bodyOf, fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { VisitDialog } from '../../components/visit/VisitDialog';
import { useVisitDialog } from './useVisitDialog';

const MORNING: Shift = {
  id: 1,
  nameAr: 'صباحي',
  nameEn: 'Morning',
  startsMinute: 0,
  endsMinute: 1440,
};

/** The page's «Check in a visit», with the dialog the hook prepares. */
function Harness({ shifts }: { shifts: Shift[] }) {
  const dialog = useVisitDialog({ spaceId: 7, shifts, full: false });
  return (
    <>
      <button
        type="button"
        onClick={() => {
          dialog.setOpen(true);
        }}
      >
        Open
      </button>
      <VisitDialog dialog={dialog} />
    </>
  );
}

/** The space's terms, and the check-ins answered by `checkIn`. */
function serve(checkIn: () => FakeAnswer | Promise<FakeAnswer>, terms = visitTerms()) {
  return fakeTransport((request) =>
    request.url === '/manage/spaces/7/visit-terms' ? ok(terms) : checkIn(),
  );
}

function renderDialog(shifts: Shift[] = []) {
  render(
    <QueryClientProvider client={createQueryClient()}>
      <Harness shifts={shifts} />
      <Toaster label="Notifications" />
    </QueryClientProvider>,
  );
}

/** A line with the Unicode isolates around its values removed, as a reader hears it. */
const heard = (expected: string) => (content: string) => content.replace(/[⁦-⁩]/g, '') === expected;

const keysOf = (requests: ReturnType<typeof fakeTransport>) =>
  requests
    .filter(({ method }) => method === 'post')
    .map(({ headers }) => headers.get('Idempotency-Key'));

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  vi.useRealTimers();
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
});

describe('useVisitDialog', () => {
  it('sends the name, the audience where it is offered, and the current shift', async () => {
    const user = userEvent.setup();
    const requests = serve(() => ok(deskVisit(), 201));
    renderDialog([MORNING]);

    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.type(await screen.findByRole('textbox', { name: 'Name' }), 'Omar');
    await user.click(await screen.findByRole('checkbox', { name: 'Student' }));
    await user.click(screen.getByRole('button', { name: 'Check in' }));

    await findToast(heard('Omar checked in'));
    const post = requests.find(({ method }) => method === 'post');
    expect(post?.url).toBe('/manage/spaces/7/visits');
    expect(bodyOf(post)).toEqual({ visitorName: 'Omar', audience: 'STUDENT', shiftId: 1 });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('offers no «Student» where the terms carry no student rates, and sends no shift for a space with none', async () => {
    const user = userEvent.setup();
    const terms = visitTerms({
      rates: [{ shiftId: null, general: { hourAgorot: 500, dayAgorot: null }, student: null }],
    });
    const requests = serve(() => ok(deskVisit(), 201), terms);
    renderDialog();

    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(await screen.findByText(heard('Charged ₪5 an hour.'))).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Student' })).toBeNull();
    expect(screen.queryByRole('combobox', { name: /Shift/ })).toBeNull();
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Layla');
    await user.click(screen.getByRole('button', { name: 'Check in' }));

    await findToast(heard('Layla checked in'));
    expect(bodyOf(requests.find(({ method }) => method === 'post'))).toEqual({
      visitorName: 'Layla',
      audience: 'GENERAL',
    });
  });

  it('keeps one key on a retry after no answer and on a second press while pending; a new key when opened again', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const pending = deferred<FakeAnswer>();
    let attempt = 0;
    const requests = serve(() => {
      attempt += 1;
      if (attempt <= 3) return { failure: 'ERR_NETWORK' };
      if (attempt === 4) return pending.promise;
      return ok(deskVisit(), 201);
    });
    renderDialog();

    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.type(await screen.findByRole('textbox', { name: 'Name' }), 'Omar');
    await user.click(screen.getByRole('button', { name: 'Check in' }));
    // The transport sends it twice more, after 1 s and 2 s, before it says no answer came back.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_100);
    });
    const failure = await screen.findByRole('alert');
    expect(failure).toHaveTextContent(
      'No answer came back. Try again — it won’t be recorded twice.',
    );

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await user.click(screen.getByRole('button', { name: 'Check in' }));
    pending.resolve(ok(deskVisit(), 201));
    await findToast(heard('Omar checked in'));

    const first = keysOf(requests);
    expect(first.length).toBeGreaterThanOrEqual(4);
    expect(new Set(first).size).toBe(1);

    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.type(await screen.findByRole('textbox', { name: 'Name' }), 'Sara');
    await user.click(screen.getByRole('button', { name: 'Check in' }));
    await findToast(heard('Sara checked in'));

    const keys = keysOf(requests);
    expect(keys.at(-1)).not.toBe(first[0]);
  });

  it('says the server’s warnings in the toast, as a warning', async () => {
    const user = userEvent.setup();
    serve(() => ({
      status: 201,
      data: {
        success: true,
        data: deskVisit(),
        meta: { warnings: ['SPACE_FULL', 'CLOSURE_IN_FORCE'] },
      },
    }));
    renderDialog();

    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.type(await screen.findByRole('textbox', { name: 'Name' }), 'Rami');
    await user.click(screen.getByRole('button', { name: 'Check in' }));

    const toast = await findToast(heard('Rami checked in'));
    const item = toast.closest('[data-sonner-toast]');
    expect(item).toHaveAttribute('data-type', 'warning');
    await waitFor(() => {
      expect(item).toHaveTextContent('The space is full; the check-in was recorded anyway.');
    });
    expect(item).toHaveTextContent(
      'The space is announced closed now; the check-in was recorded anyway.',
    );
  });
});
