import type { BookingStatus } from '@/lib/supabase';

export interface DriverReview {
  rating: number;
  review: string | null;
  created_at: string;
}

export interface DriverRatingSummary {
  average: number;
  total: number;
  reviews: DriverReview[];
}

export const EMPTY_DRIVER_RATINGS: DriverRatingSummary = { average: 0, total: 0, reviews: [] };

export function canRateDriver(status: BookingStatus, hasRated: boolean) {
  return status === 'completed' && !hasRated;
}

export function normalizeDriverRatings(value: unknown): DriverRatingSummary {
  if (!value || typeof value !== 'object') return EMPTY_DRIVER_RATINGS;
  const input = value as Record<string, unknown>;
  const reviews = Array.isArray(input['reviews'])
    ? input['reviews'].flatMap((item): DriverReview[] => {
        if (!item || typeof item !== 'object') return [];
        const review = item as Record<string, unknown>;
        const rating = Number(review['rating']);
        if (!Number.isInteger(rating) || rating < 1 || rating > 5 || typeof review['created_at'] !== 'string') return [];
        return [{
          rating,
          review: typeof review['review'] === 'string' ? review['review'] : null,
          created_at: review['created_at'],
        }];
      })
    : [];
  const average = Number(input['average']);
  const total = Number(input['total']);
  return {
    average: Number.isFinite(average) ? Math.max(0, Math.min(5, average)) : 0,
    total: Number.isInteger(total) && total >= 0 ? total : reviews.length,
    reviews,
  };
}
