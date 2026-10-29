import { createQueryClient } from '@shared/api';
import { establishSession } from '@shared/session';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { aSession } from '../../../../test/fakeSession';
import { fakeTransport, refused, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { ReportAction } from './ReportAction';

/** A reader's text, with the Unicode isolates around inserted values removed. */
const seen = (text: string | null | undefined) => (text ?? '').replace(/[⁦-⁩]/g, '');

/** «Report wrong information» for «Masaha Hub», signed in, the server refusing with a 500. */
function renderAction(verified: boolean) {
  fakeTransport(() => refused(500, { type: 'server' }));
  const { container } = render(
    <QueryClientProvider client={createQueryClient()}>
      <ReportAction
        slug="masaha-hub"
        name={{ text: 'Masaha Hub' }}
        verified={verified}
        signIn={vi.fn()}
        openMyReports={vi.fn()}
      />
    </QueryClientProvider>,
  );
  return container;
}

beforeEach(() => {
  startPreferences('en');
  establishSession(aSession(), { source: 'signIn' });
});

afterEach(() => {
  restoreTransport();
});

describe('ReportAction', () => {
  it('opens a dialog named by its title, says who reads it, the field focused first; axe-clean', async () => {
    const container = renderAction(true);

    await userEvent.click(screen.getByRole('button', { name: 'Report wrong information' }));

    const dialog = await screen.findByRole('dialog', { name: 'Report wrong information' });
    expect(seen(dialog.textContent)).toContain(
      'Your report on Masaha Hub goes to the space’s management; you’ll find their reply in “My reports”.',
    );
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'What’s wrong?' })).toHaveFocus();
    });
    expect(await axe(container.ownerDocument.body)).toHaveNoViolations();
  });

  it('says our team reads an unverified space’s report', async () => {
    renderAction(false);

    await userEvent.click(screen.getByRole('button', { name: 'Report wrong information' }));

    expect(seen((await screen.findByRole('dialog')).textContent)).toContain(
      'Our team reviews your report on Masaha Hub; you’ll find the reply in “My reports”.',
    );
  });

  it('shows a refusal as an alert in the dialog, and gives the focus back to the button once closed', async () => {
    renderAction(true);
    const trigger = screen.getByRole('button', { name: 'Report wrong information' });
    await userEvent.click(trigger);
    await userEvent.click(await screen.findByRole('combobox', { name: 'What’s wrong?' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Prices' }));
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('We couldn’t send the report');

    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(trigger).toHaveFocus();
  });
});
