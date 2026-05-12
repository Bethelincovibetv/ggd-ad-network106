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
    PostgrestVersion: "14.5"
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
      admin_chat_messages: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          receiver_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          receiver_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
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
      business_addons: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_free: boolean
          name: string
          price: number
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_free?: boolean
          name: string
          price?: number
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_free?: boolean
          name?: string
          price?: number
          sort_order?: number | null
        }
        Relationships: []
      }
      business_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      business_listings: {
        Row: {
          business_profile_id: string
          created_at: string
          description: string | null
          featured_until: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          price: number | null
          title: string
          user_id: string
        }
        Insert: {
          business_profile_id: string
          created_at?: string
          description?: string | null
          featured_until?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          price?: number | null
          title: string
          user_id: string
        }
        Update: {
          business_profile_id?: string
          created_at?: string
          description?: string | null
          featured_until?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          price?: number | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_listings_business_profile_id_fkey"
            columns: ["business_profile_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_profiles: {
        Row: {
          address: string | null
          business_name: string
          category_id: string | null
          created_at: string
          description: string | null
          directory_subscription_expires_at: string | null
          facebook_url: string | null
          hero_image_url: string | null
          id: string
          instagram_url: string | null
          is_directory_listed: boolean | null
          logo_url: string | null
          paystack_enabled: boolean | null
          paystack_public_key: string | null
          phone_number: string | null
          telegram_url: string | null
          tiktok_url: string | null
          twitter_url: string | null
          user_id: string
          website_link: string | null
          whatsapp_group_link: string | null
          whatsapp_link: string | null
        }
        Insert: {
          address?: string | null
          business_name: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          directory_subscription_expires_at?: string | null
          facebook_url?: string | null
          hero_image_url?: string | null
          id?: string
          instagram_url?: string | null
          is_directory_listed?: boolean | null
          logo_url?: string | null
          paystack_enabled?: boolean | null
          paystack_public_key?: string | null
          phone_number?: string | null
          telegram_url?: string | null
          tiktok_url?: string | null
          twitter_url?: string | null
          user_id: string
          website_link?: string | null
          whatsapp_group_link?: string | null
          whatsapp_link?: string | null
        }
        Update: {
          address?: string | null
          business_name?: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          directory_subscription_expires_at?: string | null
          facebook_url?: string | null
          hero_image_url?: string | null
          id?: string
          instagram_url?: string | null
          is_directory_listed?: boolean | null
          logo_url?: string | null
          paystack_enabled?: boolean | null
          paystack_public_key?: string | null
          phone_number?: string | null
          telegram_url?: string | null
          tiktok_url?: string | null
          twitter_url?: string | null
          user_id?: string
          website_link?: string | null
          whatsapp_group_link?: string | null
          whatsapp_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_profiles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "business_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      co_owner_applications: {
        Row: {
          account_name: string
          account_number: string
          admin_notes: string | null
          bank_name: string
          created_at: string
          earning_percentage: number | null
          id: string
          reviewed_at: string | null
          status: string
          total_earnings: number | null
          user_id: string
        }
        Insert: {
          account_name: string
          account_number: string
          admin_notes?: string | null
          bank_name: string
          created_at?: string
          earning_percentage?: number | null
          id?: string
          reviewed_at?: string | null
          status?: string
          total_earnings?: number | null
          user_id: string
        }
        Update: {
          account_name?: string
          account_number?: string
          admin_notes?: string | null
          bank_name?: string
          created_at?: string
          earning_percentage?: number | null
          id?: string
          reviewed_at?: string | null
          status?: string
          total_earnings?: number | null
          user_id?: string
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
      link_clicks: {
        Row: {
          country: string | null
          created_at: string
          device: string | null
          id: string
          referrer: string | null
          short_link_id: string
          user_agent: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          device?: string | null
          id?: string
          referrer?: string | null
          short_link_id: string
          user_agent?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          device?: string | null
          id?: string
          referrer?: string | null
          short_link_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "link_clicks_short_link_id_fkey"
            columns: ["short_link_id"]
            isOneToOne: false
            referencedRelation: "short_links"
            referencedColumns: ["id"]
          },
        ]
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
      platform_pricing: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          platform_key: string
          platform_name: string
          price_per_task: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          platform_key: string
          platform_name: string
          price_per_task?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          platform_key?: string
          platform_name?: string
          price_per_task?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          business_category: string | null
          business_description: string | null
          business_location: string | null
          business_logo_url: string | null
          business_name: string | null
          business_phone: string | null
          business_slug: string | null
          business_website: string | null
          created_at: string
          credits: number
          display_name: string | null
          email: string | null
          id: string
          industry: string | null
          is_banned: boolean | null
          last_credit_date: string | null
          profile_setup_complete: boolean
          referral_code: string | null
          referred_by: string | null
          referred_by_user_id: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          business_category?: string | null
          business_description?: string | null
          business_location?: string | null
          business_logo_url?: string | null
          business_name?: string | null
          business_phone?: string | null
          business_slug?: string | null
          business_website?: string | null
          created_at?: string
          credits?: number
          display_name?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          is_banned?: boolean | null
          last_credit_date?: string | null
          profile_setup_complete?: boolean
          referral_code?: string | null
          referred_by?: string | null
          referred_by_user_id?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          business_category?: string | null
          business_description?: string | null
          business_location?: string | null
          business_logo_url?: string | null
          business_name?: string | null
          business_phone?: string | null
          business_slug?: string | null
          business_website?: string | null
          created_at?: string
          credits?: number
          display_name?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          is_banned?: boolean | null
          last_credit_date?: string | null
          profile_setup_complete?: boolean
          referral_code?: string | null
          referred_by?: string | null
          referred_by_user_id?: string | null
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
          is_active: boolean | null
          target_audience: string | null
          title: string
          type: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          target_audience?: string | null
          title: string
          type?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          target_audience?: string | null
          title?: string
          type?: string | null
        }
        Relationships: []
      }
      promotional_videos: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          section: string
          sort_order: number | null
          title: string
          youtube_url: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          section?: string
          sort_order?: number | null
          title: string
          youtube_url: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          section?: string
          sort_order?: number | null
          title?: string
          youtube_url?: string
        }
        Relationships: []
      }
      referral_earnings: {
        Row: {
          created_at: string
          credits_earned: number
          id: string
          referred_user_id: string
          referrer_id: string
          source: string
          source_amount: number
        }
        Insert: {
          created_at?: string
          credits_earned?: number
          id?: string
          referred_user_id: string
          referrer_id: string
          source?: string
          source_amount?: number
        }
        Update: {
          created_at?: string
          credits_earned?: number
          id?: string
          referred_user_id?: string
          referrer_id?: string
          source?: string
          source_amount?: number
        }
        Relationships: []
      }
      referral_messages: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          receiver_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          receiver_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      short_links: {
        Row: {
          clicks: number
          created_at: string
          id: string
          is_active: boolean
          link_type: string
          slug: string
          target_url: string
          title: string | null
          user_id: string
        }
        Insert: {
          clicks?: number
          created_at?: string
          id?: string
          is_active?: boolean
          link_type?: string
          slug: string
          target_url: string
          title?: string | null
          user_id: string
        }
        Update: {
          clicks?: number
          created_at?: string
          id?: string
          is_active?: boolean
          link_type?: string
          slug?: string
          target_url?: string
          title?: string | null
          user_id?: string
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
          admin_notes: string | null
          created_at: string
          facebook_influence: string | null
          id: string
          other_platforms: string | null
          reviewed_at: string | null
          state: string | null
          status: string | null
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
          other_platforms?: string | null
          reviewed_at?: string | null
          state?: string | null
          status?: string | null
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
          other_platforms?: string | null
          reviewed_at?: string | null
          state?: string | null
          status?: string | null
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
          avatar_url: string | null
          bank_name: string | null
          created_at: string
          id: string
          ranking_score: number | null
          state: string | null
          tasks_completed: number | null
          user_id: string
          verified_platforms: string[] | null
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          avatar_url?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          ranking_score?: number | null
          state?: string | null
          tasks_completed?: number | null
          user_id: string
          verified_platforms?: string[] | null
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          avatar_url?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          ranking_score?: number | null
          state?: string | null
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
          deadline_hours: number | null
          description: string | null
          flyer_url: string | null
          id: string
          locations: string | null
          max_syndicates: number | null
          placements: string[] | null
          share_link: string | null
          status: string | null
          target_state: string | null
          title: string
          total_cost: number | null
        }
        Insert: {
          business_user_id: string
          cost_per_syndicate?: number | null
          created_at?: string
          deadline_hours?: number | null
          description?: string | null
          flyer_url?: string | null
          id?: string
          locations?: string | null
          max_syndicates?: number | null
          placements?: string[] | null
          share_link?: string | null
          status?: string | null
          target_state?: string | null
          title: string
          total_cost?: number | null
        }
        Update: {
          business_user_id?: string
          cost_per_syndicate?: number | null
          created_at?: string
          deadline_hours?: number | null
          description?: string | null
          flyer_url?: string | null
          id?: string
          locations?: string | null
          max_syndicates?: number | null
          placements?: string[] | null
          share_link?: string | null
          status?: string | null
          target_state?: string | null
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
      task_share_clicks: {
        Row: {
          country: string | null
          created_at: string
          id: string
          referrer: string | null
          share_link_id: string
          user_agent: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: string
          referrer?: string | null
          share_link_id: string
          user_agent?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: string
          referrer?: string | null
          share_link_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_share_clicks_share_link_id_fkey"
            columns: ["share_link_id"]
            isOneToOne: false
            referencedRelation: "task_share_links"
            referencedColumns: ["id"]
          },
        ]
      }
      task_share_links: {
        Row: {
          clicks: number
          created_at: string
          id: string
          sharer_user_id: string
          slug: string
          task_id: string
        }
        Insert: {
          clicks?: number
          created_at?: string
          id?: string
          sharer_user_id: string
          slug?: string
          task_id: string
        }
        Update: {
          clicks?: number
          created_at?: string
          id?: string
          sharer_user_id?: string
          slug?: string
          task_id?: string
        }
        Relationships: []
      }
      task_wallets: {
        Row: {
          balance: number | null
          created_at: string
          id: string
          total_earned: number | null
          total_funded: number | null
          total_spent: number | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string
          id?: string
          total_earned?: number | null
          total_funded?: number | null
          total_spent?: number | null
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string
          id?: string
          total_earned?: number | null
          total_funded?: number | null
          total_spent?: number | null
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          completions_count: number
          created_at: string
          creator_id: string | null
          description: string | null
          flyer_url: string | null
          funded: boolean
          id: string
          is_active: boolean | null
          max_completions: number
          reward_credits: number | null
          share_url: string | null
          task_type: string | null
          title: string
        }
        Insert: {
          completions_count?: number
          created_at?: string
          creator_id?: string | null
          description?: string | null
          flyer_url?: string | null
          funded?: boolean
          id?: string
          is_active?: boolean | null
          max_completions?: number
          reward_credits?: number | null
          share_url?: string | null
          task_type?: string | null
          title: string
        }
        Update: {
          completions_count?: number
          created_at?: string
          creator_id?: string | null
          description?: string | null
          flyer_url?: string | null
          funded?: boolean
          id?: string
          is_active?: boolean | null
          max_completions?: number
          reward_credits?: number | null
          share_url?: string | null
          task_type?: string | null
          title?: string
        }
        Relationships: []
      }
      user_addon_purchases: {
        Row: {
          addon_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          addon_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          addon_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_addon_purchases_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "business_addons"
            referencedColumns: ["id"]
          },
        ]
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
          premium_tier: number | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          premium_tier?: number | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          premium_tier?: number | null
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
      self_upgrade_premium: { Args: { _tier: number }; Returns: undefined }
    }
    Enums: {
      app_role:
        | "admin"
        | "premium"
        | "business"
        | "syndicate"
        | "moderator"
        | "user"
        | "co_owner"
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
        "co_owner",
      ],
    },
  },
} as const
