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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ad_events: {
        Row: {
          ad_id: string
          api_key_id: string | null
          created_at: string
          event_type: string
          id: string
          referrer: string | null
        }
        Insert: {
          ad_id: string
          api_key_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          referrer?: string | null
        }
        Update: {
          ad_id?: string
          api_key_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          referrer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_events_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_events_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      ads: {
        Row: {
          clicks: number
          created_at: string
          description: string
          expires_at: string | null
          id: string
          image_url: string | null
          impressions: number
          is_active: boolean
          target_url: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          clicks?: number
          created_at?: string
          description: string
          expires_at?: string | null
          id?: string
          image_url?: string | null
          impressions?: number
          is_active?: boolean
          target_url: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          clicks?: number
          created_at?: string
          description?: string
          expires_at?: string | null
          id?: string
          image_url?: string | null
          impressions?: number
          is_active?: boolean
          target_url?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          api_key: string
          created_at: string
          domain: string | null
          id: string
          is_active: boolean
          name: string
          requests_count: number
          user_id: string
        }
        Insert: {
          api_key?: string
          created_at?: string
          domain?: string | null
          id?: string
          is_active?: boolean
          name?: string
          requests_count?: number
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string
          domain?: string | null
          id?: string
          is_active?: boolean
          name?: string
          requests_count?: number
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      business_profiles: {
        Row: {
          business_name: string
          created_at: string
          description: string | null
          id: string
          is_verified: boolean
          logo_url: string | null
          user_id: string
          website_link: string | null
          whatsapp_link: string | null
        }
        Insert: {
          business_name: string
          created_at?: string
          description?: string | null
          id?: string
          is_verified?: boolean
          logo_url?: string | null
          user_id: string
          website_link?: string | null
          whatsapp_link?: string | null
        }
        Update: {
          business_name?: string
          created_at?: string
          description?: string | null
          id?: string
          is_verified?: boolean
          logo_url?: string | null
          user_id?: string
          website_link?: string | null
          whatsapp_link?: string | null
        }
        Relationships: []
      }
      credit_transfers: {
        Row: {
          amount: number
          created_at: string
          id: string
          receiver_id: string
          sender_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          receiver_id: string
          sender_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      marketing_apps: {
        Row: {
          app_link: string
          created_at: string
          credit_cost: number
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_free: boolean
          sort_order: number
          title: string
        }
        Insert: {
          app_link: string
          created_at?: string
          credit_cost?: number
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_free?: boolean
          sort_order?: number
          title: string
        }
        Update: {
          app_link?: string
          created_at?: string
          credit_cost?: number
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_free?: boolean
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string
          credits_amount: number | null
          currency: string
          id: string
          paystack_reference: string | null
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          credits_amount?: number | null
          currency?: string
          id?: string
          paystack_reference?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          credits_amount?: number | null
          currency?: string
          id?: string
          paystack_reference?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          credits: number
          display_name: string | null
          email: string | null
          id: string
          is_banned: boolean
          last_credit_date: string | null
          referral_code: string | null
          referred_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits?: number
          display_name?: string | null
          email?: string | null
          id?: string
          is_banned?: boolean
          last_credit_date?: string | null
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits?: number
          display_name?: string | null
          email?: string | null
          id?: string
          is_banned?: boolean
          last_credit_date?: string | null
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promotional_materials: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          target_audience: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          target_audience?: string
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          target_audience?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      slides: {
        Row: {
          created_at: string
          id: string
          image_url: string
          is_active: boolean
          link_url: string | null
          sort_order: number
          title: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean
          link_url?: string | null
          sort_order?: number
          title?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean
          link_url?: string | null
          sort_order?: number
          title?: string | null
        }
        Relationships: []
      }
      syndicate_applications: {
        Row: {
          admin_notes: string | null
          created_at: string
          facebook_influence: string | null
          id: string
          proof_screenshots: string[] | null
          reviewed_at: string | null
          status: string
          telegram_influence: string | null
          tiktok_influence: string | null
          twitter_influence: string | null
          user_id: string
          whatsapp_influence: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          facebook_influence?: string | null
          id?: string
          proof_screenshots?: string[] | null
          reviewed_at?: string | null
          status?: string
          telegram_influence?: string | null
          tiktok_influence?: string | null
          twitter_influence?: string | null
          user_id: string
          whatsapp_influence?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          facebook_influence?: string | null
          id?: string
          proof_screenshots?: string[] | null
          reviewed_at?: string | null
          status?: string
          telegram_influence?: string | null
          tiktok_influence?: string | null
          twitter_influence?: string | null
          user_id?: string
          whatsapp_influence?: string | null
        }
        Relationships: []
      }
      syndicate_profiles: {
        Row: {
          account_name: string | null
          account_number: string | null
          bank_name: string | null
          created_at: string
          id: string
          is_verified: boolean
          ranking_score: number
          total_tasks_completed: number
          user_id: string
          verified_platforms: string[]
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean
          ranking_score?: number
          total_tasks_completed?: number
          user_id: string
          verified_platforms?: string[]
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean
          ranking_score?: number
          total_tasks_completed?: number
          user_id?: string
          verified_platforms?: string[]
        }
        Relationships: []
      }
      syndicate_task_assignments: {
        Row: {
          created_at: string
          id: string
          proof_screenshot_url: string | null
          reviewed_at: string | null
          reviewer_notes: string | null
          status: string
          submitted_at: string | null
          syndicate_user_id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          proof_screenshot_url?: string | null
          reviewed_at?: string | null
          reviewer_notes?: string | null
          status?: string
          submitted_at?: string | null
          syndicate_user_id: string
          task_id: string
        }
        Update: {
          created_at?: string
          id?: string
          proof_screenshot_url?: string | null
          reviewed_at?: string | null
          reviewer_notes?: string | null
          status?: string
          submitted_at?: string | null
          syndicate_user_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "syndicate_task_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "syndicate_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      syndicate_tasks: {
        Row: {
          assigned_count: number
          business_user_id: string
          cost_per_syndicate: number
          created_at: string
          description: string
          expires_at: string | null
          flyer_url: string | null
          id: string
          max_syndicates: number
          share_link: string | null
          status: string
          target_locations: string[] | null
          target_placements: string[]
          title: string
          total_cost: number
        }
        Insert: {
          assigned_count?: number
          business_user_id: string
          cost_per_syndicate?: number
          created_at?: string
          description: string
          expires_at?: string | null
          flyer_url?: string | null
          id?: string
          max_syndicates?: number
          share_link?: string | null
          status?: string
          target_locations?: string[] | null
          target_placements?: string[]
          title: string
          total_cost?: number
        }
        Update: {
          assigned_count?: number
          business_user_id?: string
          cost_per_syndicate?: number
          created_at?: string
          description?: string
          expires_at?: string | null
          flyer_url?: string | null
          id?: string
          max_syndicates?: number
          share_link?: string | null
          status?: string
          target_locations?: string[] | null
          target_placements?: string[]
          title?: string
          total_cost?: number
        }
        Relationships: []
      }
      task_completions: {
        Row: {
          completed_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_completions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          total_funded: number
          total_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          total_funded?: number
          total_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          total_funded?: number
          total_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          reward_credits: number
          share_url: string | null
          task_type: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          reward_credits?: number
          share_url?: string | null
          task_type?: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          reward_credits?: number
          share_url?: string | null
          task_type?: string
          title?: string
        }
        Relationships: []
      }
      user_app_redemptions: {
        Row: {
          app_id: string
          id: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          app_id: string
          id?: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          app_id?: string
          id?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_app_redemptions_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "marketing_apps"
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
      withdrawal_requests: {
        Row: {
          account_name: string
          account_number: string
          admin_notes: string | null
          amount: number
          bank_name: string
          created_at: string
          id: string
          processed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          account_name: string
          account_number: string
          admin_notes?: string | null
          amount: number
          bank_name: string
          created_at?: string
          id?: string
          processed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          account_name?: string
          account_number?: string
          admin_notes?: string | null
          amount?: number
          bank_name?: string
          created_at?: string
          id?: string
          processed_at?: string | null
          status?: string
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
    }
    Enums: {
      app_role: "admin" | "user" | "premium" | "business" | "syndicate"
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
  public: {
    Enums: {
      app_role: ["admin", "user", "premium", "business", "syndicate"],
    },
  },
} as const
