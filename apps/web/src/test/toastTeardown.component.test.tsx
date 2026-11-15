import { Toaster, toast } from '@shared/design-system';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { waitOutToastRemoval } from './toastRemoval.ts';

// The toast library removes a dismissed toast on a timer its unmount never clears. The shared setup's
// wait, `waitOutToastRemoval`, outlasts the library's removal timer, so it leaves no timer running
// once the file's jsdom is torn down; this test fails if the helper does not wait (finding 219).
describe('a toast dismissed as its file ends', () => {
  it('is gone from the document once the setup has waited out its removal', async () => {
    render(<Toaster label="Notifications" />);
    act(() => {
      toast('Saved');
    });
    await screen.findByText('Saved');

    act(() => {
      toast.dismiss();
    });

    await waitOutToastRemoval();

    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });
});
