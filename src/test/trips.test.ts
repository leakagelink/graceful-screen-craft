import { describe, expect, it, vi } from 'vitest';
import { actOnTrip } from '@/lib/trips';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({ supabase: { rpc: vi.fn() } }));

describe('Trip actions', () => {
  it('submits driver offers for the selected booking', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: { ok: true }, error: null } as never);
    expect(await actOnTrip('booking-1', 'offer', { amount: 4500 })).toEqual({ error: null });
    expect(supabase.rpc).toHaveBeenLastCalledWith('trip_action', expect.objectContaining({ _booking_id: 'booking-1', _action: 'offer', _amount: 4500 }));
  });
  it('returns rejected OTP verification rather than reporting delivery success', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: { ok: false, error: 'Incorrect OTP' }, error: null } as never);
    expect(await actOnTrip('booking-1', 'verify_delivery', { otp: '000000' })).toEqual({ error: 'Incorrect OTP' });
  });
  it('keeps concurrent assignment rejection visible', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: { message: 'Load is no longer available' } } as never);
    expect(await actOnTrip('booking-1', 'take')).toEqual({ error: 'Load is no longer available' });
  });
});