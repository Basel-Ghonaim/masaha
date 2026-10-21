import { describe, expect, it } from 'vitest';
import { pinMark } from './pinMark';

describe('pinMark', () => {
  it('each live state is a shape as well as a colour', () => {
    expect(pinMark('AVAILABLE')).toEqual({ shape: 'filled', tone: 'success' });
    expect(pinMark('FULL')).toEqual({ shape: 'bar', tone: 'warning' });
    expect(pinMark('CLOSED')).toEqual({ shape: 'hollow', tone: 'neutral' });
    expect(pinMark(null)).toEqual({ shape: 'dashed', tone: 'muted' });
    const shapes = [pinMark('AVAILABLE'), pinMark('FULL'), pinMark('CLOSED'), pinMark(null)].map(
      (mark) => mark.shape,
    );
    expect(new Set(shapes).size).toBe(4);
  });
});
