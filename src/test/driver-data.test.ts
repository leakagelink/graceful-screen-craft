import { describe, expect, it } from 'vitest';
import { driverEarnings, pickupDistance, type DriverBooking } from '@/lib/driver-data';

describe('Driver extras', () => {
  it('does not count completed delivery as a transferred payout', () => {
    const booking = { total_fare: 10000, status: 'completed', payout_status: 'pending', payout_1_status: 'pending', payout_2_status: 'pending' } as DriverBooking;
    expect(driverEarnings([booking])).toEqual({ earned: 9750, paid: 0, completed: 1 });
  });
  it('counts recorded first and final half payouts separately', () => {
    const booking = { total_fare: 10000, status: 'completed', payout_status: 'pending', payout_1_status: 'paid', payout_2_status: 'pending' } as DriverBooking;
    expect(driverEarnings([booking]).paid).toBe(5000);
    expect(driverEarnings([{ ...booking, payout_2_status: 'paid' }]).paid).toBe(9750);
  });
  it('includes nearby pickup coordinates inside the ten kilometre filter', () => {
    const distance = pickupDistance({ pickup_lat: 21.15, pickup_lng: 79.09 } as DriverBooking, { lat: 21.1458, lng: 79.0882 });
    expect(distance).not.toBeNull(); expect(distance).toBeLessThan(10);
    expect(pickupDistance({} as DriverBooking, { lat: 21, lng: 79 })).toBeNull();
  });
});