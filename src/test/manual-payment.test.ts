import { describe, expect, it } from 'vitest';
import { buildUpiUri, isValidTransactionReference, normalizeTransactionReference } from '@/lib/manual-payment';

describe('manual payment references', () => {
  it('normalizes a valid UTR before submission', () => {
    expect(normalizeTransactionReference('  utr123456789  ')).toBe('UTR123456789');
    expect(isValidTransactionReference('  utr123456789  ')).toBe(true);
  });

  it('rejects short or unsafe transaction references', () => {
    expect(isValidTransactionReference('12345')).toBe(false);
    expect(isValidTransactionReference('UTR 123456789')).toBe(false);
    expect(isValidTransactionReference('<script>123456</script>')).toBe(false);
  });
});

describe('UPI payment intent', () => {
  it('uses the selected admin UPI details and exact booking amount', () => {
    const uri = buildUpiUri({ upi_id: 'merchant@bank', payee_name: 'Vahakam Transport' }, 10000, '12345678-abcd');
    expect(uri).toContain('upi://pay?pa=merchant%40bank');
    expect(uri).toContain('pn=Vahakam%20Transport');
    expect(uri).toContain('am=10000.00');
    expect(uri).toContain('cu=INR');
    expect(uri).toContain('Vahakam%20booking%2012345678');
  });
});
