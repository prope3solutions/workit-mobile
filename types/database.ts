export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'member' | 'gym_admin' | 'trainer' | 'super_admin'
export type AdminRole = 'owner' | 'manager' | 'staff'
export type EquipmentCategory = 'cardio' | 'strength' | 'combat' | 'aquatic' | 'flexibility' | 'group' | 'recovery' | 'custom'
export type SubscriptionTier = 'free' | 'basic' | 'pro' | 'elite'
export type MembershipStatus = 'active' | 'expired' | 'cancelled' | 'pending'
export type PaymentMethod = 'paystack' | 'cash' | 'pos' | 'transfer'
export type PaymentVerifiedBy = 'system' | 'gym_admin'
export type CheckedInBy = 'self' | 'admin'
export type NotificationType = string
export type TrainerStatus = 'pending_review' | 'approved' | 'rejected' | 'more_info_requested' | 'paused'
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type BookingStatus = 'pending_payment' | 'upcoming' | 'completed' | 'cancelled'
export type ServiceType = 'gym_training' | 'home_training' | 'online_coaching'
export type PricingType = 'per_session' | 'weekly' | 'monthly'
export type Gender = 'male' | 'female' | 'prefer_not_to_say'
export type TimeBlock = 'morning' | 'afternoon' | 'evening'
export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity_plan_items: {
        Row: {
          day_of_week: number | null
          display_order: number | null
          duration_minutes: number | null
          equipment_id: string | null
          id: string
          notes: string | null
          plan_id: string
        }
        Insert: {
          day_of_week?: number | null
          display_order?: number | null
          duration_minutes?: number | null
          equipment_id?: string | null
          id?: string
          notes?: string | null
          plan_id: string
        }
        Update: {
          day_of_week?: number | null
          display_order?: number | null
          duration_minutes?: number | null
          equipment_id?: string | null
          id?: string
          notes?: string | null
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_plan_items_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "gym_equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "activity_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_plans: {
        Row: {
          created_at: string | null
          gym_id: string
          id: string
          is_active: boolean | null
          member_id: string
          name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          gym_id: string
          id?: string
          is_active?: boolean | null
          member_id: string
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          gym_id?: string
          id?: string
          is_active?: boolean | null
          member_id?: string
          name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_plans_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_plans_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          amount_naira: number
          cancellation_reason: string | null
          cancelled_by: string | null
          created_at: string | null
          gym_id: string | null
          id: string
          member_id: string
          paystack_reference: string | null
          platform_fee_naira: number | null
          pricing_type: string
          service_type: string
          session_date: string
          session_time_block: string | null
          status: string
          trainer_id: string
          trainer_payout_naira: number
          updated_at: string | null
        }
        Insert: {
          amount_naira: number
          cancellation_reason?: string | null
          cancelled_by?: string | null
          created_at?: string | null
          gym_id?: string | null
          id?: string
          member_id: string
          paystack_reference?: string | null
          platform_fee_naira?: number | null
          pricing_type: string
          service_type: string
          session_date: string
          session_time_block?: string | null
          status?: string
          trainer_id: string
          trainer_payout_naira: number
          updated_at?: string | null
        }
        Update: {
          amount_naira?: number
          cancellation_reason?: string | null
          cancelled_by?: string | null
          created_at?: string | null
          gym_id?: string | null
          id?: string
          member_id?: string
          paystack_reference?: string | null
          platform_fee_naira?: number | null
          pricing_type?: string
          service_type?: string
          session_date?: string
          session_time_block?: string | null
          status?: string
          trainer_id?: string
          trainer_payout_naira?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      checkins: {
        Row: {
          checked_in_at: string | null
          checked_in_by: string | null
          gym_id: string
          id: string
          member_id: string
          membership_id: string
        }
        Insert: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          gym_id: string
          id?: string
          member_id: string
          membership_id: string
        }
        Update: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          gym_id?: string
          id?: string
          member_id?: string
          membership_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkins_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          fields: Json
          template_key: string
          updated_at: string | null
        }
        Insert: {
          fields?: Json
          template_key: string
          updated_at?: string | null
        }
        Update: {
          fields?: Json
          template_key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      equipment: {
        Row: {
          category: string
          display_order: number | null
          gym_id: string | null
          icon_url: string | null
          id: string
          is_custom: boolean | null
          name: string
        }
        Insert: {
          category: string
          display_order?: number | null
          gym_id?: string | null
          icon_url?: string | null
          id?: string
          is_custom?: boolean | null
          name: string
        }
        Update: {
          category?: string
          display_order?: number | null
          gym_id?: string | null
          icon_url?: string | null
          id?: string
          is_custom?: boolean | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_activity_events: {
        Row: {
          actor_id: string
          created_at: string
          event_type: string
          gym_id: string
          id: string
          payload: Json
        }
        Insert: {
          actor_id: string
          created_at?: string
          event_type: string
          gym_id: string
          id?: string
          payload?: Json
        }
        Update: {
          actor_id?: string
          created_at?: string
          event_type?: string
          gym_id?: string
          id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "gym_activity_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_activity_events_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_admins: {
        Row: {
          admin_role: string | null
          created_at: string | null
          gym_id: string
          id: string
          user_id: string
        }
        Insert: {
          admin_role?: string | null
          created_at?: string | null
          gym_id: string
          id?: string
          user_id: string
        }
        Update: {
          admin_role?: string | null
          created_at?: string | null
          gym_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_admins_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_check_ins: {
        Row: {
          checked_in_at: string
          created_at: string
          gym_id: string
          id: string
          member_id: string
        }
        Insert: {
          checked_in_at?: string
          created_at?: string
          gym_id: string
          id?: string
          member_id: string
        }
        Update: {
          checked_in_at?: string
          created_at?: string
          gym_id?: string
          id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_check_ins_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_check_ins_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_demo_requests: {
        Row: {
          admin_email_sent_at: string | null
          city: string
          confirmation_email_sent_at: string | null
          created_at: string
          email: string
          email_error: string | null
          gym_name: string
          id: string
          internal_notes: string | null
          member_count_range: string | null
          message: string | null
          owner_name: string
          phone: string
          preferred_contact: string
          preferred_demo_time: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_email_sent_at?: string | null
          city: string
          confirmation_email_sent_at?: string | null
          created_at?: string
          email: string
          email_error?: string | null
          gym_name: string
          id?: string
          internal_notes?: string | null
          member_count_range?: string | null
          message?: string | null
          owner_name: string
          phone: string
          preferred_contact?: string
          preferred_demo_time?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_email_sent_at?: string | null
          city?: string
          confirmation_email_sent_at?: string | null
          created_at?: string
          email?: string
          email_error?: string | null
          gym_name?: string
          id?: string
          internal_notes?: string | null
          member_count_range?: string | null
          message?: string | null
          owner_name?: string
          phone?: string
          preferred_contact?: string
          preferred_demo_time?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_demo_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_equipment: {
        Row: {
          equipment_id: string
          gym_id: string
          id: string
          quantity: number | null
        }
        Insert: {
          equipment_id: string
          gym_id: string
          id?: string
          quantity?: number | null
        }
        Update: {
          equipment_id?: string
          gym_id?: string
          id?: string
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gym_equipment_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_equipment_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_owner_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          demo_request_id: string | null
          email: string
          gym_id: string
          id: string
          invited_by: string | null
          owner_user_id: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          demo_request_id?: string | null
          email: string
          gym_id: string
          id?: string
          invited_by?: string | null
          owner_user_id: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          demo_request_id?: string | null
          email?: string
          gym_id?: string
          id?: string
          invited_by?: string | null
          owner_user_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_owner_invitations_demo_request_id_fkey"
            columns: ["demo_request_id"]
            isOneToOne: false
            referencedRelation: "gym_demo_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_owner_invitations_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_owner_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_owner_invitations_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_payout_requests: {
        Row: {
          amount_naira: number
          gym_id: string
          id: string
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          requested_at: string | null
          requested_by: string | null
          status: string
        }
        Insert: {
          amount_naira: number
          gym_id: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string | null
          requested_by?: string | null
          status?: string
        }
        Update: {
          amount_naira?: number
          gym_id?: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string | null
          requested_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_payout_requests_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_payout_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_payout_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_ranking_boosts: {
        Row: {
          amount_paid_naira: number
          boost_level: number | null
          created_at: string | null
          ends_at: string
          gym_id: string
          id: string
          paystack_reference: string
          starts_at: string
        }
        Insert: {
          amount_paid_naira: number
          boost_level?: number | null
          created_at?: string | null
          ends_at: string
          gym_id: string
          id?: string
          paystack_reference: string
          starts_at: string
        }
        Update: {
          amount_paid_naira?: number
          boost_level?: number | null
          created_at?: string | null
          ends_at?: string
          gym_id?: string
          id?: string
          paystack_reference?: string
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_ranking_boosts_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          gym_id: string
          id: string
          member_id: string
          membership_id: string
          rating: number
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          gym_id: string
          id?: string
          member_id: string
          membership_id: string
          rating: number
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          gym_id?: string
          id?: string
          member_id?: string
          membership_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "gym_reviews_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_reviews_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_reviews_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: true
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      gyms: {
        Row: {
          address: string
          brand_primary_color: string | null
          brand_secondary_color: string | null
          city: string
          claim_token: string | null
          claimed_at: string | null
          cover_image_url: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          email: string | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          paystack_subaccount_code: string | null
          phone: string | null
          rating: number | null
          review_count: number | null
          settlement_account_name: string | null
          settlement_account_number: string | null
          settlement_bank_code: string | null
          setup_equipment: boolean | null
          setup_gym_details: boolean | null
          setup_payout: boolean | null
          setup_plans: boolean | null
          setup_submitted: boolean | null
          setup_trainers: boolean | null
          slug: string
          state: string
          subscription_expires_at: string | null
          subscription_tier: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          address: string
          brand_primary_color?: string | null
          brand_secondary_color?: string | null
          city: string
          claim_token?: string | null
          claimed_at?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          paystack_subaccount_code?: string | null
          phone?: string | null
          rating?: number | null
          review_count?: number | null
          settlement_account_name?: string | null
          settlement_account_number?: string | null
          settlement_bank_code?: string | null
          setup_equipment?: boolean | null
          setup_gym_details?: boolean | null
          setup_payout?: boolean | null
          setup_plans?: boolean | null
          setup_submitted?: boolean | null
          setup_trainers?: boolean | null
          slug: string
          state: string
          subscription_expires_at?: string | null
          subscription_tier?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          address?: string
          brand_primary_color?: string | null
          brand_secondary_color?: string | null
          city?: string
          claim_token?: string | null
          claimed_at?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          paystack_subaccount_code?: string | null
          phone?: string | null
          rating?: number | null
          review_count?: number | null
          settlement_account_name?: string | null
          settlement_account_number?: string | null
          settlement_bank_code?: string | null
          setup_equipment?: boolean | null
          setup_gym_details?: boolean | null
          setup_payout?: boolean | null
          setup_plans?: boolean | null
          setup_submitted?: boolean | null
          setup_trainers?: boolean | null
          slug?: string
          state?: string
          subscription_expires_at?: string | null
          subscription_tier?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gyms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      member_connections: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_connections_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_connections_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      member_gym_requests: {
        Row: {
          address_label: string | null
          created_at: string
          gym_name: string
          id: string
          internal_note: string | null
          latitude: number
          longitude: number
          matched_gym_id: string | null
          member_id: string
          member_note: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address_label?: string | null
          created_at?: string
          gym_name: string
          id?: string
          internal_note?: string | null
          latitude: number
          longitude: number
          matched_gym_id?: string | null
          member_id: string
          member_note?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address_label?: string | null
          created_at?: string
          gym_name?: string
          id?: string
          internal_note?: string | null
          latitude?: number
          longitude?: number
          matched_gym_id?: string | null
          member_id?: string
          member_note?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_gym_requests_matched_gym_id_fkey"
            columns: ["matched_gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_gym_requests_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_plans: {
        Row: {
          created_at: string | null
          description: string | null
          duration_days: number
          features: Json | null
          gym_id: string
          id: string
          is_active: boolean | null
          name: string
          price_naira: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_days: number
          features?: Json | null
          gym_id: string
          id?: string
          is_active?: boolean | null
          name: string
          price_naira: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_days?: number
          features?: Json | null
          gym_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
          price_naira?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "membership_plans_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          added_by_admin_id: string | null
          amount_paid_naira: number
          created_at: string | null
          end_date: string
          gym_id: string
          gym_payout_naira: number
          id: string
          invite_claimed_at: string | null
          invite_token: string | null
          member_id: string
          payment_method: string
          payment_verified_by: string
          paystack_reference: string | null
          plan_id: string | null
          platform_fee_naira: number | null
          start_date: string
          status: string
          trainer_id: string | null
          updated_at: string | null
        }
        Insert: {
          added_by_admin_id?: string | null
          amount_paid_naira: number
          created_at?: string | null
          end_date: string
          gym_id: string
          gym_payout_naira: number
          id?: string
          invite_claimed_at?: string | null
          invite_token?: string | null
          member_id: string
          payment_method: string
          payment_verified_by: string
          paystack_reference?: string | null
          plan_id?: string | null
          platform_fee_naira?: number | null
          start_date: string
          status?: string
          trainer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          added_by_admin_id?: string | null
          amount_paid_naira?: number
          created_at?: string | null
          end_date?: string
          gym_id?: string
          gym_payout_naira?: number
          id?: string
          invite_claimed_at?: string | null
          invite_token?: string | null
          member_id?: string
          payment_method?: string
          payment_verified_by?: string
          paystack_reference?: string | null
          plan_id?: string | null
          platform_fee_naira?: number | null
          start_date?: string
          status?: string
          trainer_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memberships_added_by_admin_id_fkey"
            columns: ["added_by_admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainers"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string | null
          id: string
          is_read: boolean | null
          metadata: Json | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          auto_approve_gyms: boolean
          automated_t1_payouts: boolean
          key: string
          platform_fee_bps: number
          require_cac_documentation: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          auto_approve_gyms?: boolean
          automated_t1_payouts?: boolean
          key: string
          platform_fee_bps?: number
          require_cac_documentation?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          auto_approve_gyms?: boolean
          automated_t1_payouts?: boolean
          key?: string
          platform_fee_bps?: number
          require_cac_documentation?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string | null
          description: string | null
          gym_id: string
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          gym_id: string
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          gym_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          created_at: string | null
          id: string
          message: string
          status: string
          subject: string
          submitted_by: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          status?: string
          subject: string
          submitted_by: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          status?: string
          subject?: string
          submitted_by?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_availability: {
        Row: {
          day_of_week: number
          id: string
          is_available: boolean | null
          time_blocks: string[] | null
          trainer_id: string
        }
        Insert: {
          day_of_week: number
          id?: string
          is_available?: boolean | null
          time_blocks?: string[] | null
          trainer_id: string
        }
        Update: {
          day_of_week?: number
          id?: string
          is_available?: boolean | null
          time_blocks?: string[] | null
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_availability_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_blocked_dates: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          reason: string | null
          start_date: string
          trainer_id: string
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          reason?: string | null
          start_date: string
          trainer_id: string
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          reason?: string | null
          start_date?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_blocked_dates_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_certifications: {
        Row: {
          certification_name: string
          created_at: string | null
          document_url: string
          expiration_date: string | null
          id: string
          issuing_organization: string
          trainer_id: string
          year_issued: number
        }
        Insert: {
          certification_name: string
          created_at?: string | null
          document_url: string
          expiration_date?: string | null
          id?: string
          issuing_organization: string
          trainer_id: string
          year_issued: number
        }
        Update: {
          certification_name?: string
          created_at?: string | null
          document_url?: string
          expiration_date?: string | null
          id?: string
          issuing_organization?: string
          trainer_id?: string
          year_issued?: number
        }
        Relationships: [
          {
            foreignKeyName: "trainer_certifications_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_gym_affiliations: {
        Row: {
          created_at: string | null
          gym_id: string
          id: string
          trainer_id: string
        }
        Insert: {
          created_at?: string | null
          gym_id: string
          id?: string
          trainer_id: string
        }
        Update: {
          created_at?: string | null
          gym_id?: string
          id?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_gym_affiliations_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainer_gym_affiliations_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_identity_verification: {
        Row: {
          created_at: string | null
          government_id_url: string
          id: string
          proof_of_address_url: string | null
          selfie_url: string
          trainer_id: string
        }
        Insert: {
          created_at?: string | null
          government_id_url: string
          id?: string
          proof_of_address_url?: string | null
          selfie_url: string
          trainer_id: string
        }
        Update: {
          created_at?: string | null
          government_id_url?: string
          id?: string
          proof_of_address_url?: string | null
          selfie_url?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_identity_verification_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: true
            referencedRelation: "trainer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_payout_requests: {
        Row: {
          amount_naira: number
          id: string
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          requested_at: string | null
          status: string
          trainer_id: string
        }
        Insert: {
          amount_naira: number
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string | null
          status?: string
          trainer_id: string
        }
        Update: {
          amount_naira?: number
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string | null
          status?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_payout_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainer_payout_requests_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_pricing: {
        Row: {
          amount_naira: number
          created_at: string | null
          id: string
          is_active: boolean | null
          pricing_type: string
          trainer_id: string
        }
        Insert: {
          amount_naira: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          pricing_type: string
          trainer_id: string
        }
        Update: {
          amount_naira?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          pricing_type?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_pricing_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_profiles: {
        Row: {
          admin_note: string | null
          availability_paused: boolean | null
          avg_rating: number | null
          bio: string | null
          city: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string | null
          date_of_birth: string | null
          display_name: string
          email: string
          first_name: string
          gender: string | null
          id: string
          is_independent: boolean | null
          languages_spoken: string[] | null
          last_name: string
          phone: string
          photo_url: string | null
          review_count: number | null
          service_types: string[] | null
          setup_availability: boolean | null
          setup_basic_info: boolean | null
          setup_bio: boolean | null
          setup_certifications: boolean | null
          setup_gyms: boolean | null
          setup_identity: boolean | null
          setup_pricing: boolean | null
          setup_professional_info: boolean | null
          setup_service_type: boolean | null
          setup_submitted: boolean | null
          specializations: string[] | null
          state: string | null
          status: string
          updated_at: string | null
          user_id: string
          years_experience: number | null
        }
        Insert: {
          admin_note?: string | null
          availability_paused?: boolean | null
          avg_rating?: number | null
          bio?: string | null
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          display_name: string
          email: string
          first_name: string
          gender?: string | null
          id?: string
          is_independent?: boolean | null
          languages_spoken?: string[] | null
          last_name: string
          phone: string
          photo_url?: string | null
          review_count?: number | null
          service_types?: string[] | null
          setup_availability?: boolean | null
          setup_basic_info?: boolean | null
          setup_bio?: boolean | null
          setup_certifications?: boolean | null
          setup_gyms?: boolean | null
          setup_identity?: boolean | null
          setup_pricing?: boolean | null
          setup_professional_info?: boolean | null
          setup_service_type?: boolean | null
          setup_submitted?: boolean | null
          specializations?: string[] | null
          state?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
          years_experience?: number | null
        }
        Update: {
          admin_note?: string | null
          availability_paused?: boolean | null
          avg_rating?: number | null
          bio?: string | null
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          display_name?: string
          email?: string
          first_name?: string
          gender?: string | null
          id?: string
          is_independent?: boolean | null
          languages_spoken?: string[] | null
          last_name?: string
          phone?: string
          photo_url?: string | null
          review_count?: number | null
          service_types?: string[] | null
          setup_availability?: boolean | null
          setup_basic_info?: boolean | null
          setup_bio?: boolean | null
          setup_certifications?: boolean | null
          setup_gyms?: boolean | null
          setup_identity?: boolean | null
          setup_pricing?: boolean | null
          setup_professional_info?: boolean | null
          setup_service_type?: boolean | null
          setup_submitted?: boolean | null
          specializations?: string[] | null
          state?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trainer_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_reviews: {
        Row: {
          booking_id: string
          comment: string | null
          created_at: string | null
          id: string
          member_id: string
          rating: number
          trainer_id: string
        }
        Insert: {
          booking_id: string
          comment?: string | null
          created_at?: string | null
          id?: string
          member_id: string
          rating: number
          trainer_id: string
        }
        Update: {
          booking_id?: string
          comment?: string | null
          created_at?: string | null
          id?: string
          member_id?: string
          rating?: number
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainer_reviews_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainer_reviews_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trainers: {
        Row: {
          bio: string | null
          created_at: string | null
          full_name: string
          gym_id: string
          id: string
          is_active: boolean | null
          monthly_fee_naira: number
          photo_url: string | null
          specialty: string[] | null
          user_id: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          full_name: string
          gym_id: string
          id?: string
          is_active?: boolean | null
          monthly_fee_naira: number
          photo_url?: string | null
          specialty?: string[] | null
          user_id?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          full_name?: string
          gym_id?: string
          id?: string
          is_active?: boolean | null
          monthly_fee_naira?: number
          photo_url?: string | null
          specialty?: string[] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trainers_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          nickname: string | null
          phone: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          is_active?: boolean | null
          nickname?: string | null
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          nickname?: string | null
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      workout_exercises: {
        Row: {
          calories: number | null
          category: string
          completed_at: string | null
          created_at: string
          display_order: number
          duration_minutes: number | null
          id: string
          name: string
          notes: string | null
          reps: number | null
          session_id: string
          sets: number | null
          training_area: string | null
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          calories?: number | null
          category?: string
          completed_at?: string | null
          created_at?: string
          display_order?: number
          duration_minutes?: number | null
          id?: string
          name: string
          notes?: string | null
          reps?: number | null
          session_id: string
          sets?: number | null
          training_area?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          calories?: number | null
          category?: string
          completed_at?: string | null
          created_at?: string
          display_order?: number
          duration_minutes?: number | null
          id?: string
          name?: string
          notes?: string | null
          reps?: number | null
          session_id?: string
          sets?: number | null
          training_area?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          gym_id: string
          id: string
          member_id: string
          plan_id: string | null
          session_date: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          gym_id: string
          id?: string
          member_id: string
          plan_id?: string | null
          session_date: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          gym_id?: string
          id?: string
          member_id?: string
          plan_id?: string | null
          session_date?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "activity_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancel_own_membership: {
        Args: { p_membership_id: string }
        Returns: {
          added_by_admin_id: string | null
          amount_paid_naira: number
          created_at: string | null
          end_date: string
          gym_id: string
          gym_payout_naira: number
          id: string
          invite_claimed_at: string | null
          invite_token: string | null
          member_id: string
          payment_method: string
          payment_verified_by: string
          paystack_reference: string | null
          plan_id: string | null
          platform_fee_naira: number | null
          start_date: string
          status: string
          trainer_id: string | null
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "memberships"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_trainer_booking: {
        Args: {
          p_gym_id: string | null
          p_paystack_reference?: string | null
          p_pricing_type: string
          p_service_type: string
          p_session_date: string
          p_session_time_block?: string | null
          p_trainer_id: string
        }
        Returns: {
          amount_naira: number
          booking_id: string
        }[]
      }
      get_auth_role: { Args: never; Returns: string }
      get_gym_leaderboard: {
        Args: { p_gym_id: string }
        Returns: {
          avatar_url: string
          checkin_count: number
          full_name: string
          member_id: string
          nickname: string
          workout_count: number
        }[]
      }
      get_gym_members: {
        Args: { p_gym_id: string }
        Returns: {
          avatar_url: string
          full_name: string
          last_active_at: string
          member_id: string
          nickname: string
        }[]
      }
      get_my_buddies: {
        Args: never
        Returns: {
          avatar_url: string
          connected_at: string
          full_name: string
          member_id: string
          nickname: string
        }[]
      }
      get_my_connection_requests: {
        Args: never
        Returns: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "member_connections"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      is_gym_admin: { Args: { p_gym_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      is_trainer_owner: { Args: { p_trainer_id: string }; Returns: boolean }
      ops_gym_directory: {
        Args: never
        Returns: {
          active_members: number
          address: string
          city: string
          created_at: string
          email: string
          id: string
          is_active: boolean
          logo_url: string
          name: string
          owner_email: string
          owner_name: string
          phone: string
          setup_submitted: boolean
          subscription_tier: string
          total_revenue: number
        }[]
      }
      request_connection: {
        Args: { p_addressee_id: string }
        Returns: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "member_connections"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      respond_connection: {
        Args: { p_connection_id: string; p_status: string }
        Returns: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "member_connections"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_workout_plan: {
        Args: { p_exercises: Json; p_session_date: string }
        Returns: string
      }
      set_workout_exercise_completion: {
        Args: { p_completed: boolean; p_exercise_id: string }
        Returns: {
          completed_at: string
          session_id: string
          status: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

