import { describe, expect, it } from 'vitest';
import { devServer } from './devServer';

describe('devServer', () => {
  it.each<Record<string, string>>([{}, { WEB_PORT: '', API_PROXY_TARGET: '' }])(
    'serves on 5320 and forwards /api to the API on 3320 when the folder sets nothing (%o)',
    (env) => {
      expect(devServer(env)).toEqual({
        port: 5320,
        strictPort: true,
        proxy: { '/api': 'http://localhost:3320' },
      });
    },
  );

  it("serves on the folder's port and forwards /api to the API it names", () => {
    expect(devServer({ WEB_PORT: '5321', API_PROXY_TARGET: 'http://localhost:3321' })).toEqual({
      port: 5321,
      strictPort: true,
      proxy: { '/api': 'http://localhost:3321' },
    });
  });

  it.each(['53a0', '0', '70000', '5320.5', '0x14C8', '1e3'])(
    'refuses %s as a port, naming WEB_PORT',
    (port) => {
      expect(() => devServer({ WEB_PORT: port })).toThrow(/WEB_PORT/);
    },
  );

  it.each(['localhost:3321', 'http//localhost:3321'])(
    'refuses %s as the API, which is not an http address, naming API_PROXY_TARGET',
    (target) => {
      expect(() => devServer({ API_PROXY_TARGET: target })).toThrow(/API_PROXY_TARGET/);
    },
  );
});
