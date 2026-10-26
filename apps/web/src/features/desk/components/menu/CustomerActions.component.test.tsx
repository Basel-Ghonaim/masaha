import type { Customer } from '@masaha/shared/customers';
import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import { useRef, useState } from 'react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { customerFile } from '../../../../test/deskCustomer';
import { visitTerms } from '../../../../test/deskVisit';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { SubscriptionSheet } from '../sheet/SubscriptionSheet';
import type { SheetEntry } from '../../types/SheetEntry';
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

  it('gives the focus back to «⋯» once the subscription sheet it opened is closed', async () => {
    const user = userEvent.setup();
    fakeTransport((request) =>
      request.url?.endsWith('/visit-terms') === true ? ok(visitTerms()) : ok(customerFile()),
    );
    /** A page holding the one sheet, as the dashboard's pages do. */
    function Page() {
      const [entry, setEntry] = useState<SheetEntry | null>(null);
      const from = useRef<HTMLElement | null>(null);
      return (
        <main>
          <CustomerActions
            spaceId={7}
            customer={SARA}
            debtAgorot={0}
            owner={false}
            fileLink={null}
            subscribe={(next, trigger) => {
              from.current = trigger;
              setEntry(next);
            }}
          />
          {entry !== null && (
            <SubscriptionSheet
              spaceId={7}
              entry={entry}
              choices={{
                state: 'ready',
                packages: [],
                retry: vi.fn(),
                prices: { state: 'ready', list: [], refresh: vi.fn() },
                shifts: [],
              }}
              returnFocus={() => from.current}
              onClose={() => {
                setEntry(null);
              }}
            />
          )}
        </main>
      );
    }
    render(
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter>
          <Page />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const trigger = screen.getByRole('button', { name: /More actions: .Sara Khalid./ });

    await user.click(trigger);
    await user.click(await screen.findByRole('menuitem', { name: 'New subscription' }));
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    expect(trigger).toHaveFocus();
  });
});
