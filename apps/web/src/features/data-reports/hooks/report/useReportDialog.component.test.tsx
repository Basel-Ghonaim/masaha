import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { establishSession } from '@shared/session';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { myReport } from '../../../../test/dataReport';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { aSession } from '../../../../test/fakeSession';
import { findToast } from '../../../../test/findToast';
import {
  bodyOf,
  fakeTransport,
  ok,
  refused,
  restoreTransport,
} from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { ReportDialog } from '../../components/report/ReportDialog';

/** A reader's text, with the Unicode isolates around inserted values removed. */
const seen = (text: string | null | undefined) => (text ?? '').replace(/[⁦-⁩]/g, '');

/**
 * The report's dialog for «Masaha Hub» (`verified`), answered by `answer`; the client's key of the
 * user's reports is watched, and «View my reports» and the close are spies.
 */
function renderDialog(answer: () => FakeAnswer | Promise<FakeAnswer>, verified = true) {
  const requests = fakeTransport(answer);
  const client = createQueryClient();
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const openMyReports = vi.fn();
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <ReportDialog
        slug="masaha-hub"
        name={{ text: 'Masaha Hub' }}
        verified={verified}
        openMyReports={openMyReports}
        onClose={onClose}
        returnFocus={() => undefined}
      />
      <Toaster label="Notifications" />
    </QueryClientProvider>,
  );
  return { requests, invalidate, openMyReports, onClose };
}

async function choose(field: string) {
  await userEvent.click(screen.getByRole('combobox', { name: 'What’s wrong?' }));
  await userEvent.click(await screen.findByRole('option', { name: field }));
}

const send = () => userEvent.click(screen.getByRole('button', { name: 'Send' }));

beforeEach(() => {
  startPreferences('en');
  establishSession(aSession(), { source: 'signIn' });
});

afterEach(() => {
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
});

describe('useReportDialog', () => {
  it('needs details for «Other» only, and sends the field with the details given or none', async () => {
    const { requests } = renderDialog(() => ok(myReport(), 201));

    await send();
    expect(await screen.findByText('Choose what’s wrong')).toBeInTheDocument();
    expect(screen.getByLabelText('Details')).toHaveAccessibleDescription(
      /Optional.*For example: the monthly price is now ₪320/,
    );

    await choose('Other');
    expect(screen.getByLabelText('Details')).not.toHaveAccessibleDescription(/Optional/);
    await send();
    expect(await screen.findByText('Write what is wrong under “Other”.')).toBeInTheDocument();
    expect(requests).toHaveLength(0);

    await choose('Opening hours');
    await send();
    await waitFor(() => {
      expect(requests).toHaveLength(1);
    });
    expect(requests[0]?.url).toBe('/spaces/masaha-hub/reports');
    expect(bodyOf(requests[0])).toEqual({ field: 'HOURS' });
  });

  it('sends «Other» with its details', async () => {
    const { requests } = renderDialog(() => ok(myReport(), 201));

    await choose('Other');
    await userEvent.type(screen.getByLabelText('Details'), 'Closed on Fridays');
    await send();

    await waitFor(() => {
      expect(requests).toHaveLength(1);
    });
    expect(bodyOf(requests[0])).toEqual({ field: 'OTHER', message: 'Closed on Fridays' });
    expect(requests[0]?.headers['Idempotency-Key']).toBeUndefined();
  });

  it('counts a 429 down with the send blocked, every value kept', async () => {
    const { onClose } = renderDialog(() =>
      refused(429, { type: 'rate_limit' }, { 'retry-after': '90' }),
    );

    await choose('Prices');
    await userEvent.type(screen.getByLabelText('Details'), 'Old price');
    await send();

    const status = await screen.findByRole('status');
    expect(seen(status.textContent)).toBe('Too many attempts. Try again in 1:30.');
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
    expect(screen.getByLabelText('Details')).toHaveValue('Old price');
    expect(screen.getByRole('combobox', { name: 'What’s wrong?' })).toHaveTextContent('Prices');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps the input when no answer comes back, says a retry is safe, and re-sends nothing by itself', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const { requests, onClose } = renderDialog(() => ({ failure: 'ERR_NETWORK' }));

      await choose('Location');
      await userEvent.type(screen.getByLabelText('Details'), 'The pin is off');
      await send();

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('We couldn’t send the report');
      expect(alert).toHaveTextContent(
        'No answer came back. Try again — the report won’t be sent twice.',
      );
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000);
      });
      expect(requests).toHaveLength(1);
      expect(screen.getByLabelText('Details')).toHaveValue('The pin is off');
      expect(onClose).not.toHaveBeenCalled();

      await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
      await waitFor(() => {
        expect(requests).toHaveLength(2);
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('says a space gone from the directory', async () => {
    renderDialog(() => refused(404, { type: 'not_found' }));

    await choose('Amenities');
    await send();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This space is no longer in the directory.',
    );
  });

  it('says where the reply lands, by the space’s verification, with «View my reports»; and reads the user’s reports again', async () => {
    const { invalidate, openMyReports, onClose } = renderDialog(() => ok(myReport(), 201));

    await choose('Opening hours');
    await send();

    const line = await findToast(
      'We sent your report to the space’s management. You’ll find their reply in “My reports”.',
    );
    // The dialog stays open in this test (its close is a spy), so the page is inert to the pointer.
    act(() => {
      within(line.closest('li') ?? document.body)
        .getByRole('button', { name: 'View my reports' })
        .click();
    });
    expect(openMyReports).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['me', 'reports'] });
  });

  it('says our team reviews an unverified space’s report, and that a repeat is already open', async () => {
    let status = 201;
    renderDialog(() => ok(myReport(), status), false);

    await choose('Contact');
    await send();
    await findToast('We sent your report to our team. You’ll find the reply in “My reports”.');

    status = 200;
    await send();
    expect(
      await findToast('You already reported this, and it is still in review.'),
    ).toBeInTheDocument();
  });
});
