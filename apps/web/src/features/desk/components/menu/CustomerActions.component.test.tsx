import type { Customer } from '@masaha/shared/customers';
import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { CustomerActions } from './CustomerActions';

const SARA: Customer = { id: 4, name: 'Sara Khalid', phone: null, archivedAt: null };

function renderActions(debtAgorot: number) {
  fakeTransport(() => ok({ ...SARA, name: 'Sara Khalil' }));
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter>
        <main>
          <CustomerActions
            spaceId={7}
            customer={SARA}
            debtAgorot={debtAgorot}
            owner
            fileLink={null}
            subscribe={vi.fn()}
          />
        </main>
      </MemoryRouter>
      <Toaster label="Notifications" />
    </QueryClientProvider>,
  );
  return screen.getByRole('button', { name: /More actions: .Sara Khalid./ });
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
});

describe('CustomerActions', () => {
  it('gives the focus back to «⋯» once the edit is saved', async () => {
    const user = userEvent.setup();
    const trigger = renderActions(0);

    await user.click(trigger);
    await user.click(await screen.findByRole('menuitem', { name: 'Edit details' }));
    const dialog = await screen.findByRole('dialog');
    const name = within(dialog).getByRole('textbox', { name: /Name/ });
    await user.clear(name);
    await user.type(name, 'Sara Khalil');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    expect(trigger).toHaveFocus();
  });

  it('gives the focus back to «⋯» once the owing archive’s question is left', async () => {
    const user = userEvent.setup();
    const trigger = renderActions(5000);

    await user.click(trigger);
    await user.click(await screen.findByRole('menuitem', { name: 'Archive…' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Back' }));

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).toBeNull();
    });
    expect(trigger).toHaveFocus();
  });
});
