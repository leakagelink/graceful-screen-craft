import { describe, expect, it, vi } from 'vitest';
import { jsPDF } from 'jspdf';
import { downloadDeliveryReceipt } from '@/lib/delivery-receipt';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({ supabase: { rpc: vi.fn() } }));
describe('Delivery receipts', () => {
  it('does not generate a receipt when delivery verification is rejected', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: { message: 'Delivery has not been verified' } } as never);
    await expect(downloadDeliveryReceipt('booking-1')).rejects.toThrow('Delivery has not been verified');
  });
  it('does not generate a receipt for an unrelated account', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: { message: 'Receipt unavailable' } } as never);
    await expect(downloadDeliveryReceipt('booking-1')).rejects.toThrow('Receipt unavailable');
  });
  it('downloads a PDF using only the verified receipt returned by the backend', async () => {
    const save = vi.spyOn(jsPDF.API, 'save').mockImplementation(function () { return this; });
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: { booking_id: 'verified-trip', pickup_location: 'Nagpur', drop_location: 'Nashik', fare: 10000, payment_status: 'NOT_REQUIRED', verified_at: '2026-11-15T12:00:00Z' }, error: null } as never);
    await downloadDeliveryReceipt('verified-trip');
    expect(supabase.rpc).toHaveBeenLastCalledWith('delivery_receipt', { _booking_id: 'verified-trip' });
    expect(save).toHaveBeenCalledWith('Vahakam-POD-verified.pdf');
    save.mockRestore();
  });
});