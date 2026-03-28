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
          created_at: string
          event_type: string
          id: string
          viewer_id: string | null
        }
        Insert: {
          ad_id: string
          created_at?: string
          event_type: string
          id?: string
          viewer_id?: string | null
        }
        Update: {
          ad_id?: string
          created_at?: string
          event_type?: string
          id?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_events_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      ads: {
        Row: {
          clicks: number | null
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          image_url: string | null
          impressions: number | null
          is_active: boolean | null
          target_url: string
          title: string
          user_id: string
        }
        Insert: {
          clicks?: number | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          impressions?: number | null
          is_active?: boolean | null
          target_url: string
          title: string
          user_id: string
        }
        Update: {
          clicks?: number | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          impressions?: number | null
          is_active?: boolean | null
          target_url?: string
          title?: string
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
          is_active: boolean | null
          name: string
          requests_count: number | null
          user_id: string
        }
        Insert: {
          api_key?: string
          created_at?: string
          domain?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          requests_count?: number | null
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string
          domain?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          requests_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
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
      feature_toggles: {
        Row: {
          created_at: string
          description: string | null
          feature_key: string
          feature_name: string
          id: string
          is_enabled: boolean | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          feature_key: string
          feature_name: string
          id?: string
          is_enabled?: boolean | null
        }
        Update: {
          created_at?: string
          description?: string | null
          feature_key?: string
          feature_name?: string
          id?: string
          is_enabled?: boolean | null
        }
        Relationships: []
      }
      marketing_apps: {
        Row: {
          app_link: string
          created_at: string
          credit_cost: number | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_free: boolean | null
          sort_order: number | null
          title: string
        }
        Insert: {
          app_link: string
          created_at?: string
          credit_cost?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_free?: boolean | null
          sort_order?: number | null
          title: string
        }
        Update: {
          app_link?: string
          created_at?: string
          credit_cost?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_free?: boolean | null
          sort_order?: number | null
          title?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          business_description: string | null
          business_logo_url: string | null
          business_name: string | null
          created_at: string
          credits: number
          display_name: string | null
          email: string | null
          id: string
          is_banned: boolean | null
          last_credit_date: string | null
          referral_code: string | null
          referred_by: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          business_description?: string | null
          business_logo_url?: string | null
          business_name?: string | null
          created_at?: string
          credits?: number
          display_name?: string | null
          email?: string | null
          id?: string
          is_banned?: boolean | null
          last_credit_date?: string | null
          referral_code?: string | null
          referred_by?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          business_description?: string | null
          business_logo_url?: string | null
          business_name?: string | null
          created_at?: string
          credits?: number
          display_name?: string | null
          email?: string | null
          id?: string
          is_banned?: boolean | null
          last_credit_date?: string | null
          referral_code?: string | null
          referred_by?: string | null
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
          target_audience: string | null
          title: string
          type: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          target_audience?: string | null
          title: string
          type?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          target_audience?: string | null
          title?: string
          type?: string | null
        }
        Relationships: []
      }
      slides: {
        Row: {
          created_at: string
          id: string
          image_url: string
          is_active: boolean | null
          link_url: string | null
          sort_order: number | null
          title: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean | null
          link_url?: string | null
          sort_order?: number | null
          title?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean | null
          link_url?: string | null
          sort_order?: number | null
          title?: string | null
        }
        Relationships: []
      }
      syndicate_applications: {
        Row: {
          created_at: string
          facebook_influence: string | null
          id: string
          other_platforms: string | null
          reviewed_at: string | null
          status: string | null
          telegram_influence: string | null
          tiktok_influence: string | null
          user_id: string
          whatsapp_influence: string | null
        }
        Insert: {
          created_at?: string
          facebook_influence?: string | null
          id?: string
          other_platforms?: string | null
          reviewed_at?: string | null
          status?: string | null
          telegram_influence?: string | null
          tiktok_influence?: string | null
          user_id: string
          whatsapp_influence?: string | null
        }
        Update: {
          created_at?: string
          facebook_influence?: string | null
          id?: string
          other_platforms?: string | null
          reviewed_at?: string | null
          status?: string | null
          telegram_influence?: string | null
          tiktok_influence?: string | null
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
          ranking_score: number | null
          tasks_completed: number | null
          user_id: string
          verified_platforms: string[] | null
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          ranking_score?: number | null
          tasks_completed?: number | null
          user_id: string
          verified_platforms?: string[] | null
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          ranking_score?: number | null
          tasks_completed?: number | null
          user_id?: string
          verified_platforms?: string[] | null
        }
        Relationships: []
      }
      syndicate_task_assignments: {
        Row: {
          created_at: string
          id: string
          proof_url: string | null
          reviewed_at: string | null
          status: string | null
          submitted_at: string | null
          syndicate_user_id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          proof_url?: string | null
          reviewed_at?: string | null
          status?: string | null
          submitted_at?: string | null
          syndicate_user_id: string
          task_id: string
        }
        Update: {
          created_at?: string
          id?: string
          proof_url?: string | null
          reviewed_at?: string | null
          status?: string | null
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
          business_user_id: string
          cost_per_syndicate: number | null
          created_at: string
          description: string | null
          flyer_url: string | null
          id: string
          locations: string | null
          max_syndicates: number | null
          placements: string[] | null
          share_link: string | null
          status: string | null
          title: string
          total_cost: number | null
        }
        Insert: {
          business_user_id: string
          cost_per_syndicate?: number | null
          created_at?: string
          description?: string | null
          flyer_url?: string | null
          id?: string
          locations?: string | null
          max_syndicates?: number | null
          placements?: string[] | null
          share_link?: string | null
          status?: string | null
          title: string
          total_cost?: number | null
        }
        Update: {
          business_user_id?: string
          cost_per_syndicate?: number | null
          created_at?: string
          description?: string | null
          flyer_url?: string | null
          id?: string
          locations?: string | null
          max_syndicates?: number | null
          placements?: string[] | null
          share_link?: string | null
          status?: string | null
          title?: string
          total_cost?: number | null
        }
        Relationships: []
      }
      task_completions: {
        Row: {
          created_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
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
          balance: number | null
          created_at: string
          id: string
          total_earned: number | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string
          id?: string
          total_earned?: number | null
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string
          id?: string
          total_earned?: number | null
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          reward_credits: number | null
          share_url: string | null
          task_type: string | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          reward_credits?: number | null
          share_url?: string | null
          task_type?: string | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          reward_credits?: number | null
          share_url?: string | null
          task_type?: string | null
          title?: string
        }
        Relationships: []
      }
      user_app_redemptions: {
        Row: {
          app_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          app_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          app_id?: string
          created_at?: string
          id?: string
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
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          account_name: string | null
          account_number: string | null
          amount: number
          bank_name: string | null
          created_at: string
          id: string
          processed_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          amount: number
          bank_name?: string | null
          created_at?: string
          id?: string
          processed_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          amount?: number
          bank_name?: string | null
          created_at?: string
          id?: string
          processed_at?: string | null
          status?: string | null
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
      app_role:
        | "admin"
        | "premium"
        | "business"
        | "syndicate"
        | "moderator"
        | "user"
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
      app_role: [
        "admin",
        "premium",
        "business",
        "syndicate",
        "moderator",
        "user",
      ],
    },
  },
} as const
