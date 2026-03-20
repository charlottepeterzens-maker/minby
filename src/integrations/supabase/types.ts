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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_translations: {
        Row: {
          id: string
          key: string
          lang: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          id?: string
          key: string
          lang?: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          id?: string
          key?: string
          lang?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      friend_access_tiers: {
        Row: {
          created_at: string
          friend_user_id: string
          id: string
          owner_id: string
          tier: Database["public"]["Enums"]["access_tier"]
        }
        Insert: {
          created_at?: string
          friend_user_id: string
          id?: string
          owner_id: string
          tier?: Database["public"]["Enums"]["access_tier"]
        }
        Update: {
          created_at?: string
          friend_user_id?: string
          id?: string
          owner_id?: string
          tier?: Database["public"]["Enums"]["access_tier"]
        }
        Relationships: []
      }
      friend_groups: {
        Row: {
          created_at: string
          emoji: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      friend_requests: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          status: string
          to_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          status?: string
          to_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          status?: string
          to_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      group_memberships: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "friend_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          content: string
          created_at: string
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "friend_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_polls: {
        Row: {
          created_at: string
          group_id: string
          id: string
          options: string[]
          question: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          options?: string[]
          question: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          options?: string[]
          question?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_polls_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "friend_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      hangout_availability: {
        Row: {
          activities: string[]
          created_at: string
          custom_note: string | null
          date: string
          entry_type: string
          id: string
          user_id: string
          visibility: string
        }
        Insert: {
          activities?: string[]
          created_at?: string
          custom_note?: string | null
          date: string
          entry_type?: string
          id?: string
          user_id: string
          visibility?: string
        }
        Update: {
          activities?: string[]
          created_at?: string
          custom_note?: string | null
          date?: string
          entry_type?: string
          id?: string
          user_id?: string
          visibility?: string
        }
        Relationships: []
      }
      hangout_comments: {
        Row: {
          availability_id: string
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          availability_id: string
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          availability_id?: string
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hangout_comments_availability_id_fkey"
            columns: ["availability_id"]
            isOneToOne: false
            referencedRelation: "hangout_availability"
            referencedColumns: ["id"]
          },
        ]
      }
      hangout_tagged_friends: {
        Row: {
          availability_id: string
          created_at: string
          id: string
          tagged_by: string
          tagged_user_id: string
        }
        Insert: {
          availability_id: string
          created_at?: string
          id?: string
          tagged_by: string
          tagged_user_id: string
        }
        Update: {
          availability_id?: string
          created_at?: string
          id?: string
          tagged_by?: string
          tagged_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hangout_tagged_friends_availability_id_fkey"
            columns: ["availability_id"]
            isOneToOne: false
            referencedRelation: "hangout_availability"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_links: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string
          id: string
          token: string
          used_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string
          id?: string
          token: string
          used_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          token?: string
          used_by?: string | null
        }
        Relationships: []
      }
      life_posts: {
        Row: {
          content: string | null
          created_at: string
          id: string
          image_url: string | null
          link_title: string | null
          link_url: string | null
          photo_layout: string
          section_id: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          link_title?: string | null
          link_url?: string | null
          photo_layout?: string
          section_id?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          link_title?: string | null
          link_url?: string | null
          photo_layout?: string
          section_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "life_posts_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "life_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      life_sections: {
        Row: {
          created_at: string
          emoji: string
          id: string
          min_tier: Database["public"]["Enums"]["access_tier"]
          name: string
          section_type: string
          sort_order: number
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string
          id?: string
          min_tier?: Database["public"]["Enums"]["access_tier"]
          name: string
          section_type?: string
          sort_order?: number
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          min_tier?: Database["public"]["Enums"]["access_tier"]
          name?: string
          section_type?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          from_user_id: string | null
          id: string
          read: boolean
          reference_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          from_user_id?: string | null
          id?: string
          read?: boolean
          reference_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          from_user_id?: string | null
          id?: string
          read?: boolean
          reference_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      period_entries: {
        Row: {
          created_at: string
          date: string
          flow_level: string | null
          id: string
          notes: string | null
          symptoms: string[] | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          flow_level?: string | null
          id?: string
          notes?: string | null
          symptoms?: string[] | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          flow_level?: string | null
          id?: string
          notes?: string | null
          symptoms?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string
          created_by: string
          date_text: string
          emoji: string
          group_id: string
          id: string
          location: string | null
          title: string
          vibe: string
        }
        Insert: {
          created_at?: string
          created_by: string
          date_text: string
          emoji?: string
          group_id: string
          id?: string
          location?: string | null
          title: string
          vibe?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          date_text?: string
          emoji?: string
          group_id?: string
          id?: string
          location?: string | null
          title?: string
          vibe?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "friend_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          option_index: number
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_index: number
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_index?: number
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "group_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "life_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "life_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          friend_request_notifications: boolean
          id: string
          meetup_notifications: boolean
          muted_users: Json
          notification_permission_asked: boolean
          notification_settings: Json
          onboarded_at: string | null
          update_notifications: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          friend_request_notifications?: boolean
          id?: string
          meetup_notifications?: boolean
          muted_users?: Json
          notification_permission_asked?: boolean
          notification_settings?: Json
          onboarded_at?: string | null
          update_notifications?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          friend_request_notifications?: boolean
          id?: string
          meetup_notifications?: boolean
          muted_users?: Json
          notification_permission_asked?: boolean
          notification_settings?: Json
          onboarded_at?: string | null
          update_notifications?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          subscription: Json | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          subscription?: Json | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          subscription?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      rsvps: {
        Row: {
          created_at: string
          id: string
          plan_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          plan_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rsvps_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_tips: {
        Row: {
          created_at: string
          id: string
          original_tip_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          original_tip_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          original_tip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_tips_original_tip_id_fkey"
            columns: ["original_tip_id"]
            isOneToOne: false
            referencedRelation: "user_tips"
            referencedColumns: ["id"]
          },
        ]
      }
      tip_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          tip_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          tip_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          tip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tip_comments_tip_id_fkey"
            columns: ["tip_id"]
            isOneToOne: false
            referencedRelation: "user_tips"
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
      user_tips: {
        Row: {
          category: string
          comment: string | null
          created_at: string
          id: string
          image_url: string | null
          sort_order: number
          title: string
          url: string | null
          user_id: string
        }
        Insert: {
          category?: string
          comment?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          sort_order?: number
          title: string
          url?: string | null
          user_id: string
        }
        Update: {
          category?: string
          comment?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          sort_order?: number
          title?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      workout_entries: {
        Row: {
          created_at: string
          date: string
          duration_mins: number | null
          id: string
          notes: string | null
          user_id: string
          workout_type: string
        }
        Insert: {
          created_at?: string
          date?: string
          duration_mins?: number | null
          id?: string
          notes?: string | null
          user_id: string
          workout_type: string
        }
        Update: {
          created_at?: string
          date?: string
          duration_mins?: number | null
          id?: string
          notes?: string | null
          user_id?: string
          workout_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_life_post: { Args: { _post_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_tier_access: {
        Args: {
          _min_tier: Database["public"]["Enums"]["access_tier"]
          _owner_id: string
          _viewer_id: string
        }
        Returns: boolean
      }
      is_group_member: { Args: { _group_id: string }; Returns: boolean }
      is_group_owner: { Args: { _group_id: string }; Returns: boolean }
    }
    Enums: {
      access_tier: "close" | "inner" | "outer"
      app_role: "admin" | "moderator" | "user"
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
      access_tier: ["close", "inner", "outer"],
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
