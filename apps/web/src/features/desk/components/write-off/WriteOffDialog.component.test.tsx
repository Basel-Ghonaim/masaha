import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { uncollectedVisit } from '../../../../test/deskVisit';
import { fakeTransport, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import type { UncollectedItem } from '../../types/UncollectedItem';
import { WriteOffDialog } from './WriteOffDialog';

// A real browser loses a field's `autoFocus` to the alert dialog's own first focus («رجوع»), which
// jsdom does not: the field here drops it, so only the dialog's own placing of the focus can pass.
vi.mock('@shared/design-system', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@shared/design-system')>();
  return {
    ...actual,
    Textarea: (props: ComponentProps<typeof actual.Textarea>) => (
      <actual.Textarea {...props} autoFocus={false} />
    ),
  };
});

const ITEM: UncollectedItem = { uncollected: uncollectedVisit(), name: 'Khalid', day: '6 Oct' };

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
});

describe('WriteOffDialog', () => {
  it('focuses its reason on opening, not «Back»', async () => {
    fakeTransport(() => {
      throw new Error('nothing is sent on opening');
    });
    render(
      <QueryClientProvider client={createQueryClient()}>
        <WriteOffDialog spaceId={7} item={ITEM} onClose={vi.fn()} returnFocus={vi.fn()} />
      </QueryClientProvider>,
    );

    await screen.findByRole('alertdialog');
    expect(screen.getByRole('textbox', { name: 'Reason' })).toHaveFocus();
  });
});
