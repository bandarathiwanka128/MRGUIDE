const {
  calculateFare,
  fareBreakdown,
  isValidDistanceKm,
} = require('../utils/fareCalculator');

const guide = {
  tier_1km: 100,
  tier_5km: 200,
  tier_10km: 300,
  tier_20km: 400,
  tier_per_km_over20: 10,
  currency: 'LKR',
};

describe('fare distance validation', () => {
  test.each([0, 1, '2.5'])('accepts valid distance %p', distance => {
    expect(isValidDistanceKm(distance)).toBe(true);
  });

  test.each([
    '',
    'not-a-distance',
    '-1',
    Infinity,
    NaN,
    null,
    undefined,
  ])('rejects invalid distance %p', distance => {
    expect(isValidDistanceKm(distance)).toBe(false);
    expect(() => calculateFare(distance, guide)).toThrow(TypeError);
  });

  test('returns the correct breakdown for a valid distance', () => {
    expect(fareBreakdown('1.23456', guide)).toEqual({
      distance_km: 1.235,
      base_fare: 200,
      platform_commission: 10,
      guide_earnings: 190,
      currency: 'LKR',
    });
  });
});
