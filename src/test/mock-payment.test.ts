import { describe, expect, it } from 'vitest';
import { createMockPayment, mockPaymentKey, readMockPayment } from '@/lib/mock-payment';
describe('isolated mock payments', () => {
  it.each(['success', 'failed', 'cancelled'] as const)('records %s only as a mock', status => {
    const payment = createMockPayment(10000, status);
    expect(payment).toMatchObject({ mode: 'mock', amount: 10000, status });
    expect(payment.reference).toMatch(/^MOCK-/);
    expect(readMockPayment(JSON.stringify(payment))).toEqual(payment);
    expect(payment).not.toHaveProperty('payment_status');
  });
  it('isolates accounts and bookings', () => {
    expect(mockPaymentKey('shipper-a', 'trip-1')).not.toBe(mockPaymentKey('shipper-b', 'trip-1'));
    expect(mockPaymentKey('shipper-a', 'trip-1')).not.toBe(mockPaymentKey('shipper-a', 'trip-2'));
  });
  it('rejects invalid amounts and non-mock records', () => {
    expect(() => createMockPayment(0, 'success')).toThrow();
    expect(() => createMockPayment(NaN, 'success')).toThrow();
    expect(readMockPayment('{"mode":"live","status":"success","amount":10000}')).toBeNull();
  });
});