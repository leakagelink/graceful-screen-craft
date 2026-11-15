import { supabase } from '@/lib/supabase';

export type SubscriptionStatus = 'free' | 'active' | 'expired' | 'locked';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price_inr: number;
  duration_days: number;
  features: string[];
  is_active: boolean;
  sort_order: number;
}

export interface ShipperSubscription {
  shipper_id: string;
  plan_id: string | null;
  start_date: string;
  expiry_date: string;
  is_active: boolean;
  is_locked: boolean;
}

export interface SubscriptionPayment {
  id: string;
  shipper_id: string;
  plan_id: string | null;
  amount_inr: number;
  payment_method: 'manual' | 'upi' | 'bank_transfer' | 'razorpay';
  payment_reference: string;
  paid_on: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  created_at: string;
}

export interface SubscriptionEvent {
  id: string;
  shipper_id: string;
  action: string;
  details: Record<string, unknown>;
  actor_id: string | null;
  created_at: string;
}

export function getSubscriptionStatus(sub: ShipperSubscription | null, now: Date = new Date()): SubscriptionStatus {
  if (!sub || !sub.is_active) return 'free';
  if (sub.is_locked) return 'locked';
  if (new Date(sub.expiry_date) <= now) return 'expired';
  return 'active';
}

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  free: 'Free',
  active: 'Active',
  expired: 'Expired',
  locked: 'Locked',
};

export async function fetchMySubscription(shipperId: string): Promise<{ data: ShipperSubscription | null; error: string | null }> {
  const { data, error } = await supabase
    .from('shipper_subscriptions')
    .select('shipper_id, plan_id, start_date, expiry_date, is_active, is_locked')
    .eq('shipper_id', shipperId)
    .maybeSingle();
  if (error) return { data: null, error: error.message };
  return { data: data as ShipperSubscription | null, error: null };
}

export async function fetchSubscriptionPayments(shipperId: string): Promise<{ data: SubscriptionPayment[]; error: string | null }> {
  const { data, error } = await supabase
    .from('subscription_payments')
    .select('id, shipper_id, plan_id, amount_inr, payment_method, payment_reference, paid_on, verification_status, created_at')
    .eq('shipper_id', shipperId)
    .order('created_at', { ascending: false });
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as SubscriptionPayment[], error: null };
}

export async function fetchSubscriptionEvents(shipperId: string): Promise<{ data: SubscriptionEvent[]; error: string | null }> {
  const { data, error } = await supabase
    .from('subscription_events')
    .select('id, shipper_id, action, details, actor_id, created_at')
    .eq('shipper_id', shipperId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as SubscriptionEvent[], error: null };
}
