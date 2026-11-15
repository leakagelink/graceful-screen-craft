import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://placeholder.supabase.co';
const supabaseAnonKey = ((import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string) || 'placeholder-key';
export const backendConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: typeof window !== 'undefined',
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type UserRole = 'shipper' | 'driver' | 'admin';

export type VehicleType =
  | 'mini_truck'
  | 'eicher_14ft'
  | 'container_20ft'
  | 'tata_ace'
  | 'bolero_pickup';

export type BookingStatus =
  | 'available'
  | 'paid'
  | 'offer_made'
  | 'assigned'
  | 'in_progress'
  | 'otp_sent'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export type KycStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  business_name: string | null;
  business_type: string | null;
  business_address: string | null;
  business_city: string | null;
  business_state: string | null;
  business_pincode: string | null;
  gstin: string | null;
  shipper_profile_completed: boolean;
  phone: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  bank_holder_name: string | null;
  referral_code: string | null;
  referred_by: string | null;
  free_until: string | null;
  created_at: string;
  kyc_status: KycStatus;
  license_number: string | null;
  license_url: string | null;
  rc_number: string | null;
  rc_url: string | null;
  insurance_url: string | null;
  vehicle_number: string | null;
  kyc_submitted_at: string | null;
  kyc_reviewed_at: string | null;
  kyc_rejection_reason: string | null;
  is_online: boolean | null;
}

export interface AppSettings {
  id: string;
  trip_otp_length: number;
  commission_rate: number;
  updated_at: string;
  updated_by: string | null;
}

export interface Booking {
  id: string;
  shipper_id: string;
  driver_id: string | null;
  pickup_location: string;
  drop_location: string;
  vehicle_type: VehicleType;
  material_type: string;
  weight_kg: number | null;
  notes: string | null;
  distance_km: number;
  trip_date: string;
  base_fare: number;
  per_km_rate: number;
  total_fare: number;
  status: BookingStatus;
  payment_id: string | null;
  platform_fee: number | null;
  driver_payout: number | null;
  payout_status: 'pending' | 'transferred' | 'failed' | null;
  payout_id: string | null;
  created_at: string;
  agreed_fare: number | null;
  assigned_at: string | null;
  delivery_otp: string | null;
  otp_sent_at: string | null;
  payout_1_status: 'pending' | 'paid' | 'failed' | null;
  payout_1_id: string | null;
  payout_2_status: 'pending' | 'paid' | 'failed' | null;
  payout_2_id: string | null;
  commission_amount: number | null;
  driver_total_payout: number | null;
  cancel_reason: string | null;
  cancelled_at: string | null;
  driver_rating: number | null;
  shipper_rating: number | null;
  driver_lat: number | null;
  driver_lng: number | null;
  driver_location_updated_at: string | null;
  payment_status: 'NOT_REQUIRED' | 'PENDING' | 'MANUAL_PAYMENT' | 'PAID' | 'FAILED' | 'REFUNDED';
  payment_method: 'manual' | 'razorpay' | null;
  payment_verified_by: string | null;
  payment_verified_at: string | null;
}

export type PaymentStatus = 'NOT_REQUIRED' | 'PENDING' | 'MANUAL_PAYMENT' | 'PAID' | 'FAILED' | 'REFUNDED';

export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'countered';

export interface Offer {
  id: string;
  booking_id: string;
  driver_id: string;
  offer_amount: number;
  status: OfferStatus;
  counter_amount: number | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  booking_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export type DisputeStatus = 'open' | 'investigating' | 'resolved' | 'dismissed';

export interface Dispute {
  id: string;
  booking_id: string;
  raised_by: string;
  reason: string;
  status: DisputeStatus;
  admin_notes: string | null;
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  booking_id: string | null;
  read: boolean;
  created_at: string;
}
