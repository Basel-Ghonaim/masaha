import { describe, expect, it } from 'vitest';
import { FRESH_TILES, nextTileCycle, type TileEvent } from './tileCycle';

/** The state after `events`, from a fresh layer. */
const after = (...events: TileEvent[]) => events.reduce(nextTileCycle, FRESH_TILES);

describe('nextTileCycle', () => {
  it('starts with nothing failed', () => {
    expect(FRESH_TILES.failed).toBe(false);
  });

  it('fails a load in which a tile failed, whatever loaded beside it', () => {
    expect(after('loading', 'tileerror', 'load').failed).toBe(true);
  });

  it('passes a load in which no tile failed', () => {
    expect(after('loading', 'load').failed).toBe(false);
  });

  it('keeps the last verdict while the next load is under way', () => {
    expect(after('loading', 'tileerror', 'load', 'loading').failed).toBe(true);
  });

  it('judges each load on its own failures: a clean load after a failed one passes', () => {
    expect(after('loading', 'tileerror', 'load', 'loading', 'load').failed).toBe(false);
  });

  it('fails a later load whose tiles fail after earlier loads passed', () => {
    expect(after('loading', 'load', 'loading', 'tileerror', 'tileerror', 'load').failed).toBe(true);
  });
});
