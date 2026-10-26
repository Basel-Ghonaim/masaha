import type { Customer } from '@masaha/shared/customers';
import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
import { EditCustomerDialog } from '../../components/edit/EditCustomerDialog';

const SARA: Customer = { id: 4, name: 'Sara Khalid', phone: '+970599000201', archivedAt: null };

/** A line with the Unicode isolates around its values removed, as a reader hears it. */
const heard = (expected: string) => (content: string) => content.replace(/[⁦-⁩]/g, '') === expected;

function renderDialog(answer: () => FakeAnswer, customer: Customer = SARA) {
  const requests = fakeTransport(answer);
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={createQueryClient()}>
      <EditCustomerDialog spaceId={7} customer={customer} onClose={onClose} />
      <Toaster label="Notifications" />
    </QueryClientProvider>,
  );
  return { requests, onClose };
}

const patches = <T extends { method?: string }>(requests: T[]) =>
  requests.filter(({ method }) => method === 'patch');

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

describe('useEditDialog', () => {
  it('sends only what changed, and says what the answer saved', async () => {
    const user = userEvent.setup();
    const { requests, onClose } = renderDialog(() => ok({ ...SARA, phone: '+970599000304' }));

    const phone = screen.getByRole('textbox', { name: /Mobile number/ });
    await user.clear(phone);
    await user.type(phone, '0599000304');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await findToast(heard('Sara Khalid’s details saved'));
    expect(patches(requests)).toHaveLength(1);
    expect(bodyOf(patches(requests)[0])).toEqual({ phone: '+970599000304' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('sends nothing when nothing changed, and says so', async () => {
    const user = userEvent.setup();
    const { requests, onClose } = renderDialog(() => ok(SARA));

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Nothing changed')).toBeVisible();
    expect(patches(requests)).toHaveLength(0);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('sends nothing for the same number typed in its local form', async () => {
    const user = userEvent.setup();
    const { requests, onClose } = renderDialog(() => ok(SARA));

    const phone = screen.getByRole('textbox', { name: /Mobile number/ });
    await user.clear(phone);
    await user.type(phone, '0599 000 201');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Nothing changed')).toBeVisible();
    expect(patches(requests)).toHaveLength(0);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('sends null for a cleared phone', async () => {
    const user = userEvent.setup();
    const { requests } = renderDialog(() => ok({ ...SARA, phone: null }));

    await user.clear(screen.getByRole('textbox', { name: /Mobile number/ }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await findToast(heard('Sara Khalid’s details saved'));
    expect(bodyOf(patches(requests)[0])).toEqual({ phone: null });
  });

  it('is never sent again by itself after no answer; the user retries', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    let lost = true;
    const { requests } = renderDialog(() =>
      lost ? { failure: 'ERR_NETWORK' } : ok({ ...SARA, name: 'Sara K.' }),
    );

    const name = screen.getByRole('textbox', { name: 'Name' });
    await user.clear(name);
    await user.type(name, 'Sara K.');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No answer came back. Try again — it won’t be recorded twice.',
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(patches(requests)).toHaveLength(1);

    lost = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await findToast(heard('Sara K.’s details saved'));
    expect(patches(requests)).toHaveLength(2);
    expect(bodyOf(patches(requests)[1])).toEqual({ name: 'Sara K.' });
  });

  it('says a phone another customer holds on the phone', async () => {
    const user = userEvent.setup();
    renderDialog(() =>
      refused(409, { type: 'conflict', code: 'PHONE_TAKEN', errors: { phone: ['not_unique'] } }),
    );

    const phone = screen.getByRole('textbox', { name: /Mobile number/ });
    await user.clear(phone);
    await user.type(phone, '0599000202');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('This phone number is already in use.')).toBeVisible();
    expect(phone).toHaveAccessibleDescription(/This phone number is already in use\./);
  });
});
