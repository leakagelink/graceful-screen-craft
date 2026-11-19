import { describe, expect, it, vi } from 'vitest';
import { getTripPaymentAmounts, reportTripPayment, tripPaymentReferenceError } from '@/lib/trip-payment';
import { calcCommission, calcDriverPayout, calcPayout1, calcPayout2 } from '@/lib/commission';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({ supabase: { rpc: vi.fn() } }));

describe('40/60 trip payments', () => {
  it('calculates exactly 40% at pickup and the remaining 60% at delivery', () => {
    expect(getTripPaymentAmounts(10000)).toEqual({ pickup40: 4000, delivery60: 6000 });
    expect(getTripPaymentAmounts(9999)).toEqual({ pickup40: 4000, delivery60: 5999 });
  });

  it('keeps the existing 5% commission on the delivery 60% portion', () => {
    expect(calcPayout1(10000)).toBe(4000);
    expect(calcPayout2(10000)).toBe(5700);
    expect(calcCommission(10000)).toBe(300);
    expect(calcDriverPayout(10000)).toBe(9700);
  });

  it('requires a transaction reference for online but not cash payments', () => {
    expect(tripPaymentReferenceError('cash', '')).toBe('');
    expect(tripPaymentReferenceError('online', '')).not.toBe('');
    expect(tripPaymentReferenceError('online', 'abc')).not.toBe('');
    expect(tripPaymentReferenceError('online', 'UTR-123456')).toBe('');
  });

  it('submits the selected stage, method and reference to the protected workflow', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: { ok: true, amount: 4000 }, error: null } as never);
    await expect(reportTripPayment('booking-1', 'pickup_40', 'online', 'UTR-123456')).resolves.toEqual({ error: null, amount: 4000 });
    expect(supabase.rpc).toHaveBeenCalledWith('report_trip_payment', { _booking_id: 'booking-1', _stage: 'pickup_40', _method: 'online', _reference: 'UTR-123456' });
  });
});
