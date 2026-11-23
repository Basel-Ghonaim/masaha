import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { ScrollRegion } from '.';

// jsdom lays nothing out: the widths are set by hand, and the stubbed observer reports when told,
// as the browser's does when a box starts being observed or changes size.
let widths = { scroll: 300, client: 300 };
let observed: Element[] = [];
let reports: (() => void)[] = [];

function resize(scroll: number, client: number) {
  widths = { scroll, client };
  act(() => {
    for (const report of reports) report();
  });
}

beforeEach(() => {
  widths = { scroll: 300, client: 300 };
  observed = [];
  reports = [];
  vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockImplementation(() => widths.scroll);
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(() => widths.client);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: ResizeObserverCallback) {
        reports.push(() => {
          callback([], this);
        });
      }
      observe(target: Element) {
        observed.push(target);
      }
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function Strip(props: { label?: string }) {
  return (
    <ScrollRegion aria-label={props.label ?? 'The other photos'}>
      <ul>
        <li>One</li>
        <li>Two</li>
      </ul>
    </ScrollRegion>
  );
}

describe('ScrollRegion', () => {
  it('is a group named by its label, or by the element it names', () => {
    render(
      <>
        <Strip />
        <h2 id="peak">Peak hours</h2>
        <ScrollRegion aria-labelledby="peak">
          <p>The heatmap</p>
        </ScrollRegion>
      </>,
    );

    expect(screen.getByRole('group', { name: 'The other photos' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Peak hours' })).toHaveTextContent('The heatmap');
  });

  it('is no tab stop while its content fits', async () => {
    const user = userEvent.setup();
    render(<Strip />);
    resize(300, 300);

    expect(screen.getByRole('group')).not.toHaveAttribute('tabindex');
    await user.tab();
    expect(document.body).toHaveFocus();
  });

  it('becomes a tab stop once its content overflows, and leaves the order when it fits again', async () => {
    const user = userEvent.setup();
    render(<Strip />);
    resize(300, 300);
    const strip = screen.getByRole('group', { name: 'The other photos' });

    resize(600, 300);
    expect(strip).toHaveAttribute('tabindex', '0');
    await user.tab();
    expect(strip).toHaveFocus();

    resize(300, 300);
    expect(strip).not.toHaveAttribute('tabindex');
  });

  it('stays a named group while its content fits, by default', () => {
    render(<Strip />);
    resize(300, 300);

    expect(screen.getByRole('group', { name: 'The other photos' })).toBeInTheDocument();
  });

  it('when asked to be quiet, is a plain box while its content fits and a named tab stop while it overflows', () => {
    render(
      <>
        <h2 id="peak">Peak hours</h2>
        <ScrollRegion aria-labelledby="peak" quietWhileFits data-testid="by-element">
          <p>The heatmap</p>
        </ScrollRegion>
        <ScrollRegion aria-label="The photos" quietWhileFits data-testid="by-label">
          <p>The row</p>
        </ScrollRegion>
      </>,
    );
    const plain = (element: HTMLElement) => {
      for (const attribute of ['role', 'aria-label', 'aria-labelledby', 'tabindex']) {
        expect(element).not.toHaveAttribute(attribute);
      }
    };
    const byElement = screen.getByTestId('by-element');
    const byLabel = screen.getByTestId('by-label');

    resize(300, 300);
    plain(byElement);
    plain(byLabel);

    resize(600, 300);
    expect(screen.getByRole('group', { name: 'Peak hours' })).toBe(byElement);
    expect(screen.getByRole('group', { name: 'The photos' })).toBe(byLabel);
    expect(byElement).toHaveAttribute('tabindex', '0');
    expect(byLabel).toHaveAttribute('tabindex', '0');

    resize(300, 300);
    plain(byElement);
    plain(byLabel);
  });

  it('watches its own box and its content’s, so either one’s resize measures it again', () => {
    render(<Strip />);

    const strip = screen.getByRole('group');
    expect(observed).toEqual([strip, screen.getByRole('list')]);
  });

  it('has no accessibility violations while it overflows', async () => {
    const { container } = render(<Strip />);
    resize(600, 300);

    expect(await axe(container)).toHaveNoViolations();
  });

  it('takes exactly one name (proven by `typecheck`)', () => {
    // Types only: `typecheck` fails if either line is accepted.
    // @ts-expect-error — a strip with no name.
    const nameless = <ScrollRegion />;
    // @ts-expect-error — a strip with two names.
    const twice = <ScrollRegion aria-label="The photos" aria-labelledby="peak" />;
    expect([nameless, twice]).toHaveLength(2);
  });
});
