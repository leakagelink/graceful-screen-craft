/**
 * Commission calculation per Vahakam business spec:
 * - Trip total = 100%
 * - Pickup 40% → Driver, 0% Vahakam commission
 * - After POD and delivery OTP, final 60% becomes payable
 * - Final 60% → 5% Vahakam commission + 95% Driver
 * - Example ₹10,000: ₹4,000 Driver + ₹300 Vahakam + ₹5,700 Driver
 * - Total commission = 3% of trip total
 * - Total driver payout = 97% of trip total
 */

export const COMMISSION_RATE = 0.03; // 3% of total (5% of delivery 60%)
export const DEFAULT_SECOND_HALF_RATE = 0.05; // 5% of second half

export function calcCommission(totalFare: number, secondHalfRate: number = DEFAULT_SECOND_HALF_RATE): number {
  const secondHalf = totalFare - Math.round(totalFare * 0.4);
  return Math.round(secondHalf * secondHalfRate);
}

export function calcDriverPayout(totalFare: number, secondHalfRate: number = DEFAULT_SECOND_HALF_RATE): number {
  const firstHalf = Math.round(totalFare * 0.4);
  const secondHalf = totalFare - firstHalf;
  const commission = Math.round(secondHalf * secondHalfRate);
  const driverSecondHalf = secondHalf - commission;
  return firstHalf + driverSecondHalf;
}

export function calcPayout1(totalFare: number): number {
  return Math.round(totalFare * 0.4);
}

export function calcPayout2(totalFare: number, secondHalfRate: number = DEFAULT_SECOND_HALF_RATE): number {
  const secondHalf = totalFare - Math.round(totalFare * 0.4);
  return Math.round(secondHalf * (1 - secondHalfRate));
}

export function calcCommissionFromSecondHalf(totalFare: number, secondHalfRate: number = DEFAULT_SECOND_HALF_RATE): number {
  const secondHalf = totalFare - Math.round(totalFare * 0.4);
  return Math.round(secondHalf * secondHalfRate);
}
