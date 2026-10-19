import assert from 'node:assert/strict';
import test from 'node:test';
import { occupancyPercent, staysOverlap } from './reservation-overlap.demo.mjs';

// Explicitly run this exercise to reproduce the intentionally introduced defects.
// It is separate from application CI. Initial expectation: two pass, two fail.
test('adjacent stays are available on either side of an existing stay', () => {
  assert.equal(staysOverlap('2027-02-08', '2027-02-10', '2027-02-05', '2027-02-08'), false);
  assert.equal(staysOverlap('2027-02-03', '2027-02-05', '2027-02-05', '2027-02-08'), false);
});

test('actual overlap is rejected and separated stays remain available', () => {
  assert.equal(staysOverlap('2027-02-07', '2027-02-10', '2027-02-05', '2027-02-08'), true);
  assert.equal(staysOverlap('2027-02-10', '2027-02-12', '2027-02-05', '2027-02-08'), false);
});

test('a month without sellable nights has finite zero occupancy', () => {
  const percent = occupancyPercent(0, 0);
  assert.equal(Number.isFinite(percent), true);
  assert.equal(percent, 0);
});

test('confirmed nights are expressed as a percentage of sellable nights', () => {
  assert.equal(occupancyPercent(3, 10), 30);
});
