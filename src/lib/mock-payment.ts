export type MockOutcome = 'success' | 'failed' | 'cancelled';
export interface MockPayment { mode: 'mock'; status: MockOutcome; amount: number; reference: string; createdAt: string }
export function createMockPayment(amount: number, status: MockOutcome): MockPayment {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Enter a valid payment amount.');
  return { mode: 'mock', status, amount, reference: `MOCK-${crypto.randomUUID()}`, createdAt: new Date().toISOString() };
}
export function mockPaymentKey(userId: string, bookingId: string) {
  return `vahakam:mock-payment:${userId}:${bookingId}`;
}
export function readMockPayment(value: string | null): MockPayment | null {
  try {
    const p = JSON.parse(value ?? 'null');
    if (p?.mode === 'mock' && ['success', 'failed', 'cancelled'].includes(p.status) && Number.isFinite(p.amount) && p.amount > 0 && typeof p.reference === 'string' && typeof p.createdAt === 'string') return p;
  } catch { /* Ignore corrupt demo data. */ }
  return null;
}