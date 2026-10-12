import { MoneyPipe } from './money.pipe';
describe('TND formatting', () => {
  it('keeps three fractional digits', () => {
    expect(new MoneyPipe().transform(540)).toBe('540.000 TND');
    expect(new MoneyPipe().transform(160.125)).toBe('160.125 TND');
  });
});
