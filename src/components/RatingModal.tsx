import { useState } from 'react';
import { Star, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button, inputClass } from '@/components/ui';

interface Props {
  bookingId: string;
  rateeId: string;
  rateeName: string;
  raterId: string;
  raterRole: 'shipper' | 'driver';
  onDone: () => void;
  onSkip: () => void;
}

export function RatingModal({ bookingId, rateeId, rateeName, raterId, raterRole, onDone, onSkip }: Props) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (rating < 1) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.from('ratings').insert({
      booking_id: bookingId,
      rater_id: raterId,
      ratee_id: rateeId,
      rating,
      review: review.trim() || null,
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    // Also update the booking's rating column
    const ratingUpdate = raterRole === 'shipper'
      ? { driver_rating: rating }
      : { shipper_rating: rating };
    await supabase.from('bookings').update(ratingUpdate).eq('id', bookingId);
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900">Rate {rateeName}</h3>
          <button onClick={onSkip} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-slate-500 mb-4">How was your experience? Your rating helps build trust on Vahakam.</p>

        <div className="flex justify-center gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              className="p-1 transition-transform hover:scale-110"
            >
              <Star
                className={`w-8 h-8 transition-colors ${
                  (hover || rating) >= n ? 'text-amber-400 fill-amber-400' : 'text-slate-200'
                }`}
              />
            </button>
          ))}
        </div>

        <textarea
          className={`${inputClass} resize-none mb-3`}
          rows={2}
          placeholder="Write a review (optional)…"
          value={review}
          onChange={(e) => setReview(e.target.value)}
        />

        {error && <p className="text-xs text-error-600 mb-3">{error}</p>}

        <div className="flex gap-2">
          <Button variant="secondary" size="md" className="flex-1" onClick={onSkip}>Skip</Button>
          <Button variant="primary" size="md" className="flex-1" onClick={submit} disabled={busy || rating < 1} loading={busy}>
            Submit Rating
          </Button>
        </div>
      </div>
    </div>
  );
}
