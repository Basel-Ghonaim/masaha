import { describe, expect, it } from 'vitest';
import { carrierOf } from './carrierOf';

describe('carrierOf', () => {
  it.each([
    ['+970599123456', 'jawwal'],
    ['+970569123456', 'ooredoo'],
    ['+972599123456', null],
    ['+972521234567', null],
    ['+97082123456', null],
  ] as const)('reads %s’s carrier from its prefix: %s', (phone, carrier) => {
    expect(carrierOf(phone)).toBe(carrier);
  });
});
