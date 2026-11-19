import { describe, expect, it } from 'vitest';
import { canRateDriver, normalizeDriverRatings } from '@/lib/ratings';

describe('Driver profile ratings', () => {
  it('allows a new rating only after the trip is completed', () => {
    expect(canRateDriver('completed', false)).toBe(true);
    expect(canRateDriver('in_progress', false)).toBe(false);
    expect(canRateDriver('assigned', false)).toBe(false);
  });

  it('does not offer a second rating for a booking already rated by the shipper', () => {
    expect(canRateDriver('completed', true)).toBe(false);
  });

  it('reads the average, total and recent review returned for the driver profile', () => {
    expect(normalizeDriverRatings({
      average: 4.5,
      total: 2,
      reviews: [{ rating: 5, review: 'Safe and timely delivery', created_at: '2026-11-19T12:00:00Z' }],
    })).toEqual({
      average: 4.5,
      total: 2,
      reviews: [{ rating: 5, review: 'Safe and timely delivery', created_at: '2026-11-19T12:00:00Z' }],
    });
  });

  it('rejects invalid star values from a malformed response', () => {
    expect(normalizeDriverRatings({ average: 4, total: 1, reviews: [{ rating: 9, review: 'Invalid', created_at: '2026-11-19' }] }).reviews).toEqual([]);
  });
});
