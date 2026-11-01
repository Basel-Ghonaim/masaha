import { describe, expect, it } from 'vitest';
import { config } from 'zod';
import indexHtml from '../../index.html?raw';

// zod probes for eval once, building its first schema, unless it is jitless; the site's
// Content-Security-Policy refuses eval and reports the probe on every page. The schemas are built
// as their modules load, before any of the app's code could configure zod, so index.html sets its
// settings in an inline script, which runs before any module.
const inlineScripts = [...indexHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
  ([, body]) => body ?? '',
);

describe("zod's settings, set before the bundle", () => {
  it('are jitless, from an inline script of index.html', () => {
    const scope: { __zod_globalConfig?: unknown } = {};
    const setter = inlineScripts.find((body) => body.includes('__zod_globalConfig')) ?? '';

    // The script is plain JavaScript inside index.html, so it is evaluated rather than imported.
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const run = new Function('globalThis', setter) as (scope: unknown) => void;
    run(scope);

    expect(scope.__zod_globalConfig).toEqual({ jitless: true });
  });

  it('are where zod reads its settings', () => {
    expect(config()).toBe((globalThis as { __zod_globalConfig?: unknown }).__zod_globalConfig);
  });
});
