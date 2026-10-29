import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { closure } from '../../../../test/announcement';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { ExtensionDialog } from './ExtensionDialog';

function renderDialog(subscriptions: number) {
  fakeTransport(() =>
    ok({
      firstDay: '2026-10-20',
      lastDay: '2026-10-21',
      proposedDays: 2,
      subscriptions,
      applied: null,
    }),
  );
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <ExtensionDialog spaceId={7} closure={closure()} onClose={vi.fn()} returnFocus={vi.fn()} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  startPreferences('ar');
});

afterEach(() => {
  restoreTransport();
});

describe('ExtensionDialog', () => {
  it('is an alert dialog named by what it asks, its days focused once they show; axe-clean', async () => {
    renderDialog(4);

    const dialog = screen.getByRole('alertdialog', {
      name: 'تمديد الاشتراكات التي شملها الإغلاق؟',
    });
    const days = await within(dialog).findByRole('textbox', { name: 'عدد الأيام' });
    expect(days).toHaveFocus();
    expect(within(dialog).getByText('يشمل التمديد 4 اشتراكات.')).toBeInTheDocument();
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it.each([
    [1, 'مدّد اشتراكًا واحدًا'],
    [2, 'مدّد اشتراكين'],
    [3, 'مدّد 3 اشتراكات'],
    [11, 'مدّد 11 اشتراكًا'],
    [100, 'مدّد 100 اشتراك'],
  ])('counts %i subscriptions in its submit, in Arabic’s own form', async (count, label) => {
    const { unmount } = renderDialog(count);
    expect(await screen.findByRole('button', { name: label })).toBeInTheDocument();
    unmount();
  });
});
