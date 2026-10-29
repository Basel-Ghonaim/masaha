import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { spaceReport } from '../../../../test/dataReport';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { startPreferences } from '../../../../test/startPreferences';
import { DecideSheet } from './DecideSheet';

function renderSheet() {
  fakeTransport(() => ok(spaceReport()));
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter>
        <DecideSheet
          target={{ audience: 'owner', spaceId: 7, report: spaceReport() }}
          editLink="/dashboard/spaces/7/profile#hours"
          showDecided={vi.fn()}
          onClose={vi.fn()}
          returnFocus={() => null}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('DecideSheet', () => {
  it.each([390, 1440])(
    'is a dialog named by the field, the reply focused first, «Edit the field» a link; axe-clean at %i px',
    async (width) => {
      stubScreenWidth(width);
      const { baseElement } = renderSheet();

      const sheet = await screen.findByRole('dialog', { name: 'Report about Opening hours' });
      expect(sheet).toHaveAccessibleDescription('A visitor · 21 October');
      expect(screen.getByRole('textbox', { name: 'Reply from the space' })).toHaveFocus();
      expect(screen.getByText('The space opens at 9, not 8.')).toBeVisible();
      expect(screen.getByText('New')).toBeVisible();
      expect(screen.getByRole('link', { name: 'Edit the field' })).toHaveAttribute(
        'href',
        '/dashboard/spaces/7/profile#hours',
      );
      expect(screen.getByRole('button', { name: 'Close' })).toBeVisible();
      expect(await axe(baseElement)).toHaveNoViolations();
    },
  );
});
