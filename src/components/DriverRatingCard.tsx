import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, MessageSquareText, RefreshCw, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { EMPTY_DRIVER_RATINGS, normalizeDriverRatings, type DriverRatingSummary } from '@/lib/ratings';
import { Button } from '@/components/ui';

interface Props {
  driverId: string;
  canRate?: boolean;
  hasRated?: boolean;
  onRate?: () => void;
  refreshKey?: number;
  ownProfile?: boolean;
}

function Stars({ value, size = 'sm' }: { value: number; size?: 'sm' | 'lg' }) {
  const rounded = Math.round(value);
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          aria-hidden="true"
          className={`${size === 'lg' ? 'h-6 w-6' : 'h-3.5 w-3.5'} ${star <= rounded ? 'fill-warning-500 text-warning-500' : 'fill-muted text-muted'}`}
        />
      ))}
    </div>
  );
}

export default function DriverRatingCard({ driverId, canRate = false, hasRated = false, onRate, refreshKey = 0, ownProfile = false }: Props) {
  const [summary, setSummary] = useState<DriverRatingSummary>(EMPTY_DRIVER_RATINGS);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    const { data, error } = await supabase.rpc('driver_reviews', { _driver_id: driverId });
    if (error) setFailed(true);
    else setSummary(normalizeDriverRatings(data));
    setLoading(false);
  }, [driverId]);

  useEffect(() => { void load(); }, [load, refreshKey]);

  return (
    <section aria-labelledby={`driver-reviews-${driverId}`} className="overflow-hidden rounded-2xl border border-border bg-card shadow-3d animate-fade-in-up">
      <div className="bg-gradient-to-br from-primary-900 to-primary-700 p-5 text-primary-foreground">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-200">{ownProfile ? 'Your reputation' : 'Driver ratings & reviews'}</p>
            <h2 id={`driver-reviews-${driverId}`} className="mt-1 font-display text-lg font-bold">Trusted by shippers</h2>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-foreground/10">
            <Star className="h-5 w-5 fill-warning-500 text-warning-500" />
          </div>
        </div>
        <div className="mt-4 flex items-end gap-3">
          <span className="font-display text-4xl font-bold leading-none">{summary.total ? summary.average.toFixed(1) : '—'}</span>
          <div className="pb-0.5">
            <Stars value={summary.average} size="lg" />
            <p className="mt-1 text-xs text-primary-200">{summary.total} {summary.total === 1 ? 'rating' : 'ratings'} · verified trips</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5">
        {onRate && (
          hasRated ? (
            <p className="flex items-center gap-2 rounded-xl bg-accent-50 px-3 py-2.5 text-sm font-semibold text-accent-800">
              <CheckCircle2 className="h-4 w-4" /> Your rating & review are submitted
            </p>
          ) : (
            <Button variant={canRate ? 'accent' : 'secondary'} size="sm" className="w-full" disabled={!canRate} onClick={onRate}>
              <Star className="h-4 w-4" /> {canRate ? 'Rate & review driver' : 'Rate after trip completion'}
            </Button>
          )
        )}

        {loading ? (
          <p role="status" className="py-3 text-center text-sm text-muted-foreground">Loading ratings…</p>
        ) : failed ? (
          <div className="text-center">
            <p role="alert" className="text-sm text-muted-foreground">Reviews could not be loaded.</p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => void load()}><RefreshCw className="h-4 w-4" />Try again</Button>
          </div>
        ) : summary.reviews.length === 0 ? (
          <div className="rounded-xl bg-muted/60 p-4 text-center">
            <MessageSquareText className="mx-auto h-5 w-5 text-muted-foreground" />
            <p className="mt-2 text-sm font-semibold text-card-foreground">No reviews yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Completed-trip feedback will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent shipper feedback</h3>
            <ul className="space-y-3">
              {summary.reviews.map((review, index) => (
                <li key={`${review.created_at}-${index}`} className="rounded-xl border border-border bg-background/60 p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <Stars value={review.rating} />
                    <span className="text-[11px] text-muted-foreground">Verified trip</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-card-foreground">{review.review?.trim() || 'Rated without a written review.'}</p>
                  <p className="mt-2 text-[11px] text-muted-foreground">{new Date(review.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
