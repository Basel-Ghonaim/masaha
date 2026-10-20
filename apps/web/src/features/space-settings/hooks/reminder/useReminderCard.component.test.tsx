import type { SpaceSettings } from '@masaha/shared/space-settings';
import { createQueryClient } from '@shared/api';
import { setLanguage } from '@shared/preferences';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bodyOf, fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { ReminderCard } from '../../components/reminder/ReminderCard';

const SETTINGS: SpaceSettings = {
  autoCheckoutAtClosing: true,
  maxStayMinutes: null,
  visitRounding: 'PER_MINUTE',
  visitRoundingMinutes: null,
  visitCapAtDayPrice: true,
  visitStudentPrices: false,
  receptionMayTypePrices: false,
  reminderTemplate: 'Hi , you owe {المبلغ}.',
};

/** The reminder card of space 7 with `reminderTemplate`, the server answering a save with it. */
function renderCard(reminderTemplate: string | null = SETTINGS.reminderTemplate) {
  const settings = { ...SETTINGS, reminderTemplate };
  const requests = fakeTransport((request) => ok({ ...settings, ...(bodyOf(request) as object) }));
  render(
    <QueryClientProvider client={createQueryClient()}>
      <ReminderCard spaceId={7} settings={settings} spaceName="Focus Hub" />
    </QueryClientProvider>,
  );
  const field = screen.getByRole<HTMLTextAreaElement>('textbox');
  return { requests, field, user: userEvent.setup() };
}

/** A line with the Unicode isolates around its inserted values removed, as a reader hears it. */
const heard = (expected: string) => (_: string, element: Element | null) =>
  element?.textContent.replace(/[\u2066-\u2069]/g, '') === expected;

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('the reminder card', () => {
  it('inserts a placeholder at the caret, and previews it filled', async () => {
    const { field, user } = renderCard();

    field.setSelectionRange(3, 3);
    await user.click(screen.getByRole('button', { name: 'Insert the name' }));

    expect(field.value).toBe('Hi {الاسم}, you owe {المبلغ}.');
    expect(field).toHaveFocus();
    expect(field.selectionStart).toBe(3 + '{الاسم}'.length);
    expect(screen.getByText('Hi Rahaf, you owe ₪150.')).toBeInTheDocument();
  });

  it('names a placeholder off the list, and asks for {المبلغ} when it is missing', async () => {
    const { field, user, requests } = renderCard();

    await user.clear(field);
    await user.type(field, 'Hi {{الاسم الكامل}, you owe {{المبلغ}');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(
      await screen.findByText(
        heard(
          '{الاسم الكامل} isn’t one of the words you can use; use the buttons to insert {الاسم}, {المبلغ} or {المساحة}.',
        ),
      ),
    ).toBeInTheDocument();

    await user.clear(field);
    await user.type(field, 'Hi {{الاسم}');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(
      await screen.findByText('Add {المبلغ} so the customer knows how much they owe.'),
    ).toBeInTheDocument();
    expect(requests.filter(({ method }) => method !== 'get')).toHaveLength(0);
  });

  it('shows the default text while the space keeps none, and keeps none when it is unchanged', async () => {
    const { field, user, requests } = renderCard(null);

    expect(field.value).toBe(
      'Hello {الاسم}, a reminder from {المساحة}: you owe {المبلغ}. You can pay at the space. Thank you.',
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
    expect(requests.filter(({ method }) => method !== 'get')).toHaveLength(0);
  });

  it('keeps none after the language changes, the other language’s default text left as it is', async () => {
    startPreferences('ar');
    const { field, user, requests } = renderCard(null);
    expect(field.value).toMatch(/^مرحبًا/);

    act(() => {
      setLanguage('en');
    });
    await waitFor(() => {
      expect(field.value).toMatch(/^Hello/);
    });
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
    expect(requests.filter(({ method }) => method !== 'get')).toHaveLength(0);
  });

  it('restores the default text, saved as none', async () => {
    const { field, user, requests } = renderCard();

    await user.click(screen.getByRole('button', { name: 'Restore the default text' }));
    expect(field.value).toMatch(/^Hello \{الاسم\}/);
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(requests.filter(({ method }) => method === 'patch')).toHaveLength(1);
    });
    expect(bodyOf(requests.find(({ method }) => method === 'patch'))).toEqual({
      reminderTemplate: null,
    });
  });
});
