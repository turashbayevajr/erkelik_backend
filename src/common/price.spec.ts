import { MAX_PRICE, isPriceWithinRange } from './price';

describe('isPriceWithinRange', () => {
  it('accepts «нет цены»', () => {
    expect(isPriceWithinRange(null)).toBe(true);
    expect(isPriceWithinRange(undefined)).toBe(true);
    expect(isPriceWithinRange('')).toBe(true);
  });

  it('accepts ordinary prices as number and string', () => {
    expect(isPriceWithinRange(0)).toBe(true);
    expect(isPriceWithinRange('19990.50')).toBe(true);
    expect(isPriceWithinRange(MAX_PRICE)).toBe(true);
  });

  // numeric(12,2): модуль должен быть меньше 10^10
  it('rejects values the price column cannot store', () => {
    expect(isPriceWithinRange(1e10)).toBe(false);
    expect(isPriceWithinRange('9999999999999')).toBe(false);
    expect(isPriceWithinRange(String(Number('1e21')))).toBe(false);
  });

  it('rejects non-numeric input', () => {
    expect(isPriceWithinRange('abc')).toBe(false);
    expect(isPriceWithinRange(Number.NaN)).toBe(false);
    expect(isPriceWithinRange(Number.POSITIVE_INFINITY)).toBe(false);
  });
});
