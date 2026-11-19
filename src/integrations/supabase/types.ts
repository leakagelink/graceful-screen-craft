export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      account_emails: {
        Row: {
          email: string | null
          id: string
        }
        Insert: {
          email?: string | null
          id: string
        }
        Update: {
          email?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_emails_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          commission_rate: number
          id: string
          trip_otp_length: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          commission_rate?: number
          id: string
          trip_otp_length?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          commission_rate?: number
          id?: string
          trip_otp_length?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          agreed_fare: number | null
          assigned_at: string | null
          base_fare: number
          cancel_reason: string | null
          cancelled_at: string | null
          commission_amount: number | null
          created_at: string
          delivery_otp: string | null
          distance_km: number
          driver_id: string | null
          driver_lat: number | null
          driver_lng: number | null
          driver_location_updated_at: string | null
          driver_payout: number | null
          driver_rating: number | null
          driver_total_payout: number | null
          drop_lat: number | null
          drop_lng: number | null
          drop_location: string
          id: string
          material_type: string
          notes: string | null
          otp_sent_at: string | null
          payment_id: string | null
          payment_method: string | null
          payment_status: string
          payment_verified_at: string | null
          payment_verified_by: string | null
          payout_1_id: string | null
          payout_1_status: string | null
          payout_2_id: string | null
          payout_2_status: string | null
          payout_id: string | null
          payout_status: string | null
          per_km_rate: number
          pickup_lat: number | null
          pickup_lng: number | null
          pickup_location: string
          platform_fee: number | null
          shipper_id: string
          shipper_rating: number | null
          status: string
          total_fare: number
          trip_date: string
          vehicle_type: string
          weight_kg: number | null
        }
        Insert: {
          agreed_fare?: number | null
          assigned_at?: string | null
          base_fare: number
          cancel_reason?: string | null
          cancelled_at?: string | null
          commission_amount?: number | null
          created_at?: string
          delivery_otp?: string | null
          distance_km: number
          driver_id?: string | null
          driver_lat?: number | null
          driver_lng?: number | null
          driver_location_updated_at?: string | null
          driver_payout?: number | null
          driver_rating?: number | null
          driver_total_payout?: number | null
          drop_lat?: number | null
          drop_lng?: number | null
          drop_location: string
          id?: string
          material_type: string
          notes?: string | null
          otp_sent_at?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string
          payment_verified_at?: string | null
          payment_verified_by?: string | null
          payout_1_id?: string | null
          payout_1_status?: string | null
          payout_2_id?: string | null
          payout_2_status?: string | null
          payout_id?: string | null
          payout_status?: string | null
          per_km_rate: number
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_location: string
          platform_fee?: number | null
          shipper_id: string
          shipper_rating?: number | null
          status?: string
          total_fare: number
          trip_date: string
          vehicle_type: string
          weight_kg?: number | null
        }
        Update: {
          agreed_fare?: number | null
          assigned_at?: string | null
          base_fare?: number
          cancel_reason?: string | null
          cancelled_at?: string | null
          commission_amount?: number | null
          created_at?: string
          delivery_otp?: string | null
          distance_km?: number
          driver_id?: string | null
          driver_lat?: number | null
          driver_lng?: number | null
          driver_location_updated_at?: string | null
          driver_payout?: number | null
          driver_rating?: number | null
          driver_total_payout?: number | null
          drop_lat?: number | null
          drop_lng?: number | null
          drop_location?: string
          id?: string
          material_type?: string
          notes?: string | null
          otp_sent_at?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string
          payment_verified_at?: string | null
          payment_verified_by?: string | null
          payout_1_id?: string | null
          payout_1_status?: string | null
          payout_2_id?: string | null
          payout_2_status?: string | null
          payout_id?: string | null
          payout_status?: string | null
          per_km_rate?: number
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_location?: string
          platform_fee?: number | null
          shipper_id?: string
          shipper_rating?: number | null
          status?: string
          total_fare?: number
          trip_date?: string
          vehicle_type?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_shipper_id_fkey"
            columns: ["shipper_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      consents: {
        Row: {
          accepted_at: string
          terms_version: string
          user_id: string
        }
        Insert: {
          accepted_at?: string
          terms_version: string
          user_id: string
        }
        Update: {
          accepted_at?: string
          terms_version?: string
          user_id?: string
        }
        Relationships: []
      }
      delivery_codes: {
        Row: {
          attempts: number
          booking_id: string
          code: string
          expires_at: string
          shipper_id: string
          verified_at: string | null
        }
        Insert: {
          attempts?: number
          booking_id: string
          code: string
          expires_at: string
          shipper_id: string
          verified_at?: string | null
        }
        Update: {
          attempts?: number
          booking_id?: string
          code?: string
          expires_at?: string
          shipper_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_codes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_proofs: {
        Row: {
          booking_id: string
          created_at: string
          driver_id: string
          file_path: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          driver_id: string
          file_path: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          driver_id?: string
          file_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_proofs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_proofs_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          admin_note: string | null
          booking_id: string
          created_at: string
          id: string
          raised_by: string
          reason: string
          status: string
        }
        Insert: {
          admin_note?: string | null
          booking_id: string
          created_at?: string
          id?: string
          raised_by: string
          reason: string
          status?: string
        }
        Update: {
          admin_note?: string | null
          booking_id?: string
          created_at?: string
          id?: string
          raised_by?: string
          reason?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_payment_methods: {
        Row: {
          account_holder: string | null
          account_number: string | null
          bank_name: string | null
          enabled: boolean
          ifsc: string | null
          is_demo: boolean
          key: string
          label: string
          payee_name: string | null
          qr_image_url: string | null
          updated_at: string
          updated_by: string | null
          upi_id: string | null
        }
        Insert: {
          account_holder?: string | null
          account_number?: string | null
          bank_name?: string | null
          enabled?: boolean
          ifsc?: string | null
          is_demo?: boolean
          key: string
          label: string
          payee_name?: string | null
          qr_image_url?: string | null
          updated_at?: string
          updated_by?: string | null
          upi_id?: string | null
        }
        Update: {
          account_holder?: string | null
          account_number?: string | null
          bank_name?: string | null
          enabled?: boolean
          ifsc?: string | null
          is_demo?: boolean
          key?: string
          label?: string
          payee_name?: string | null
          qr_image_url?: string | null
          updated_at?: string
          updated_by?: string | null
          upi_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manual_payment_methods_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_payment_requests: {
        Row: {
          admin_note: string | null
          amount: number
          booking_id: string
          created_at: string
          id: string
          method_key: string
          reviewed_at: string | null
          reviewed_by: string | null
          shipper_id: string
          status: string
          transaction_reference: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          booking_id: string
          created_at?: string
          id?: string
          method_key: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          shipper_id: string
          status?: string
          transaction_reference: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          booking_id?: string
          created_at?: string
          id?: string
          method_key?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          shipper_id?: string
          status?: string
          transaction_reference?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_payment_requests_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_payment_requests_method_key_fkey"
            columns: ["method_key"]
            isOneToOne: false
            referencedRelation: "manual_payment_methods"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "manual_payment_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_payment_requests_shipper_id_fkey"
            columns: ["shipper_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          booking_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          body: string
          booking_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          body?: string
          booking_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          booking_id: string
          counter_amount: number | null
          created_at: string
          driver_id: string
          id: string
          offer_amount: number
          status: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          counter_amount?: number | null
          created_at?: string
          driver_id: string
          id?: string
          offer_amount: number
          status?: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          counter_amount?: number | null
          created_at?: string
          driver_id?: string
          id?: string
          offer_amount?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bank_account_number: string | null
          bank_holder_name: string | null
          bank_ifsc: string | null
          bank_name: string | null
          business_address: string | null
          business_city: string | null
          business_name: string | null
          business_pincode: string | null
          business_state: string | null
          business_type: string | null
          created_at: string
          free_until: string | null
          full_name: string
          gstin: string | null
          id: string
          insurance_url: string | null
          is_online: boolean
          kyc_rejection_reason: string | null
          kyc_reviewed_at: string | null
          kyc_status: string
          kyc_submitted_at: string | null
          license_number: string | null
          license_url: string | null
          phone: string | null
          rc_number: string | null
          rc_url: string | null
          referral_code: string | null
          referred_by: string | null
          service_routes: string | null
          shipper_profile_completed: boolean
          upi_id: string | null
          vehicle_capacity: string | null
          vehicle_number: string | null
          vehicle_type: string | null
        }
        Insert: {
          bank_account_number?: string | null
          bank_holder_name?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          business_address?: string | null
          business_city?: string | null
          business_name?: string | null
          business_pincode?: string | null
          business_state?: string | null
          business_type?: string | null
          created_at?: string
          free_until?: string | null
          full_name?: string
          gstin?: string | null
          id: string
          insurance_url?: string | null
          is_online?: boolean
          kyc_rejection_reason?: string | null
          kyc_reviewed_at?: string | null
          kyc_status?: string
          kyc_submitted_at?: string | null
          license_number?: string | null
          license_url?: string | null
          phone?: string | null
          rc_number?: string | null
          rc_url?: string | null
          referral_code?: string | null
          referred_by?: string | null
          service_routes?: string | null
          shipper_profile_completed?: boolean
          upi_id?: string | null
          vehicle_capacity?: string | null
          vehicle_number?: string | null
          vehicle_type?: string | null
        }
        Update: {
          bank_account_number?: string | null
          bank_holder_name?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          business_address?: string | null
          business_city?: string | null
          business_name?: string | null
          business_pincode?: string | null
          business_state?: string | null
          business_type?: string | null
          created_at?: string
          free_until?: string | null
          full_name?: string
          gstin?: string | null
          id?: string
          insurance_url?: string | null
          is_online?: boolean
          kyc_rejection_reason?: string | null
          kyc_reviewed_at?: string | null
          kyc_status?: string
          kyc_submitted_at?: string | null
          license_number?: string | null
          license_url?: string | null
          phone?: string | null
          rc_number?: string | null
          rc_url?: string | null
          referral_code?: string | null
          referred_by?: string | null
          service_routes?: string | null
          shipper_profile_completed?: boolean
          upi_id?: string | null
          vehicle_capacity?: string | null
          vehicle_number?: string | null
          vehicle_type?: string | null
        }
        Relationships: []
      }
      ratings: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          ratee_id: string
          rater_id: string
          rating: number
          review: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          ratee_id: string
          rater_id: string
          rating: number
          review?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          ratee_id?: string
          rater_id?: string
          rating?: number
          review?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ratings_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      shipper_subscriptions: {
        Row: {
          expiry_date: string
          is_active: boolean
          is_locked: boolean
          plan_id: string | null
          shipper_id: string
          start_date: string
          updated_at: string
        }
        Insert: {
          expiry_date: string
          is_active?: boolean
          is_locked?: boolean
          plan_id?: string | null
          shipper_id: string
          start_date?: string
          updated_at?: string
        }
        Update: {
          expiry_date?: string
          is_active?: boolean
          is_locked?: boolean
          plan_id?: string | null
          shipper_id?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipper_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipper_subscriptions_shipper_id_fkey"
            columns: ["shipper_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_events: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          id: string
          shipper_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          shipper_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          shipper_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_events_shipper_id_fkey"
            columns: ["shipper_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_payments: {
        Row: {
          amount_inr: number
          created_at: string
          id: string
          paid_on: string
          payment_method: string
          payment_reference: string
          plan_id: string | null
          recorded_by: string | null
          shipper_id: string
          verification_status: string
          verified_at: string | null
        }
        Insert: {
          amount_inr: number
          created_at?: string
          id?: string
          paid_on: string
          payment_method: string
          payment_reference: string
          plan_id?: string | null
          recorded_by?: string | null
          shipper_id: string
          verification_status?: string
          verified_at?: string | null
        }
        Update: {
          amount_inr?: number
          created_at?: string
          id?: string
          paid_on?: string
          payment_method?: string
          payment_reference?: string
          plan_id?: string | null
          recorded_by?: string | null
          shipper_id?: string
          verification_status?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payments_shipper_id_fkey"
            columns: ["shipper_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          duration_days: number
          features: Json
          id: string
          is_active: boolean
          name: string
          price_inr: number
          sort_order: number
        }
        Insert: {
          duration_days: number
          features?: Json
          id: string
          is_active?: boolean
          name: string
          price_inr: number
          sort_order?: number
        }
        Update: {
          duration_days?: number
          features?: Json
          id?: string
          is_active?: boolean
          name?: string
          price_inr?: number
          sort_order?: number
        }
        Relationships: []
      }
      trip_payments: {
        Row: {
          amount: number
          booking_id: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          method: string
          reported_by: string
          stage: string
          status: string
          transaction_reference: string | null
        }
        Insert: {
          amount: number
          booking_id: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          method: string
          reported_by: string
          stage: string
          status?: string
          transaction_reference?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          method?: string
          reported_by?: string
          stage?: string
          status?: string
          transaction_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_payments_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_payments_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_review_kyc: {
        Args: { _driver_id: string; _reason?: string; _status: string }
        Returns: undefined
      }
      admin_send_notification: {
        Args: {
          _audience: string
          _body: string
          _recipient_id: string
          _title: string
        }
        Returns: Json
      }
      admin_set_manual_payment_method_enabled: {
        Args: { _enabled: boolean; _method_key: string }
        Returns: Json
      }
      admin_set_payment_status: {
        Args: { _booking_id: string; _status: string }
        Returns: undefined
      }
      admin_update_manual_payment_method: {
        Args: {
          _account_holder?: string
          _account_number?: string
          _bank_name?: string
          _ifsc?: string
          _method_key: string
          _payee_name?: string
          _qr_image_url?: string
          _upi_id?: string
        }
        Returns: Json
      }
      confirm_trip_payment: { Args: { _payment_id: string }; Returns: Json }
      delivery_receipt: { Args: { _booking_id: string }; Returns: Json }
      driver_payment_details: {
        Args: { _booking_id: string }
        Returns: {
          upi_id: string
        }[]
      }
      driver_reviews: { Args: { _driver_id: string }; Returns: Json }
      get_trip_settings: {
        Args: never
        Returns: {
          commission_rate: number
          trip_otp_length: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      initialize_account: { Args: { _role: string }; Returns: undefined }
      register_delivery_proof: {
        Args: { _booking_id: string; _file_path: string }
        Returns: Json
      }
      report_trip_payment: {
        Args: {
          _booking_id: string
          _method: string
          _reference?: string
          _stage: string
        }
        Returns: Json
      }
      review_manual_payment: {
        Args: { _note?: string; _request_id: string; _status: string }
        Returns: Json
      }
      submit_kyc: {
        Args: {
          _insurance_url?: string
          _license_number: string
          _license_url?: string
          _rc_number: string
          _rc_url?: string
          _vehicle_number: string
        }
        Returns: undefined
      }
      submit_manual_payment: {
        Args: { _booking_id: string; _method_key: string; _reference: string }
        Returns: Json
      }
      trip_action: {
        Args: {
          _action: string
          _amount?: number
          _booking_id: string
          _offer_id?: string
          _otp?: string
          _reason?: string
        }
        Returns: Json
      }
      trip_contact: {
        Args: { _booking_id: string; _person_id: string }
        Returns: {
          full_name: string
          id: string
          phone: string
          vehicle_number: string
        }[]
      }
    }
    Enums: {
      app_role: "shipper" | "driver" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["shipper", "driver", "admin"],
    },
  },
} as const
