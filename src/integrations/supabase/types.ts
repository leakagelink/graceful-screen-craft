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
          shipper_profile_completed: boolean
          vehicle_number: string | null
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
          shipper_profile_completed?: boolean
          vehicle_number?: string | null
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
          shipper_profile_completed?: boolean
          vehicle_number?: string | null
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      initialize_account: { Args: { _role: string }; Returns: undefined }
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
