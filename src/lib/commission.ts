/**
 * Commission calculation per Vahakam business spec:
 * - Trip total = 100%
 * - First 50% → Driver, 0% Vahakam commission
 * - After Delivery OTP, final 50% becomes payable
 * - Final 50% → 5% Vahakam commission + 95% Driver
 * - Example ₹10,000: ₹5,000 Driver + ₹250 Vahakam + ₹4,750 Driver
 * - Total commission = 2.5% of trip total
 * - Total driver payout = 97.5% of trip total
 */

export const COMMISSION_RATE = 0.025; // 2.5% of total (5% of second half)
export const DEFAULT_SECOND_HALF_RATE = 0.05; // 5% of second half

export function calcCommission(totalFare: number, secondHalfRate: number = DEFAULT_SECOND_HALF_RATE): number {
  const secondHalf = totalFare - Math.round(totalFare * 0.5);
  return Math.round(secondHalf * secondHalfRate);
}

export function calcDriverPayout(totalFare: number, secondHalfRate: number = DEFAULT_SECOND_HALF_RATE): number {
  const firstHalf = Math.round(totalFare * 0.5);
  const secondHalf = totalFare - firstHalf;
  const commission = Math.round(secondHalf * secondHalfRate);
  const driverSecondHalf = secondHalf - commission;
  return firstHalf + driverSecondHalf;
}

export function calcPayout1(totalFare: number): number {
  return Math.round(totalFare * 0.5);
}

export function calcPayout2(totalFare: number, secondHalfRate: number = DEFAULT_SECOND_HALF_RATE): number {
  const secondHalf = totalFare - Math.round(totalFare * 0.5);
  return Math.round(secondHalf * (1 - secondHalfRate));
}

export function calcCommissionFromSecondHalf(totalFare: number, secondHalfRate: number = DEFAULT_SECOND_HALF_RATE): number {
  const secondHalf = totalFare - Math.round(totalFare * 0.5);
  return Math.round(secondHalf * secondHalfRate);
}
