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
      achievements: {
        Row: {
          created_at: string
          description: string
          id: string
          name: string
          threshold: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          name: string
          threshold: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          name?: string
          threshold?: number
        }
        Relationships: []
      }
      activity_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json
          profile_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          profile_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_actions: {
        Row: {
          action: string
          created_at: string
          details: Json
          id: string
          target_id: string | null
          target_table: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
          target_table: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
          target_table?: string
        }
        Relationships: []
      }
      challenges: {
        Row: {
          accepted_by: string | null
          accepted_score: number | null
          challenge_code: string
          challenger_id: string
          challenger_score: number
          completed_at: string | null
          created_at: string
          expires_at: string
          id: string
          opened_at: string | null
          opens: number
          status: string
        }
        Insert: {
          accepted_by?: string | null
          accepted_score?: number | null
          challenge_code: string
          challenger_id: string
          challenger_score: number
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          opened_at?: string | null
          opens?: number
          status?: string
        }
        Update: {
          accepted_by?: string | null
          accepted_score?: number | null
          challenge_code?: string
          challenger_id?: string
          challenger_score?: number
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          opened_at?: string | null
          opens?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenges_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_challenger_id_fkey"
            columns: ["challenger_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_sessions: {
        Row: {
          attempt_number: number
          created_at: string
          ended_at: string | null
          game_version: string
          id: string
          payment_id: string | null
          profile_id: string | null
          score: number | null
          session_token_hash: string
          started_at: string
          status: string
          verification_status: string
          verified: boolean
        }
        Insert: {
          attempt_number?: number
          created_at?: string
          ended_at?: string | null
          game_version?: string
          id?: string
          payment_id?: string | null
          profile_id?: string | null
          score?: number | null
          session_token_hash: string
          started_at?: string
          status?: string
          verification_status?: string
          verified?: boolean
        }
        Update: {
          attempt_number?: number
          created_at?: string
          ended_at?: string | null
          game_version?: string
          id?: string
          payment_id?: string | null
          profile_id?: string | null
          score?: number | null
          session_token_hash?: string
          started_at?: string
          status?: string
          verification_status?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "game_sessions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_sessions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_weeks: {
        Row: {
          created_at: string
          game_key: string
          id: string
          status: string
          week_end: string
          week_start: string
        }
        Insert: {
          created_at?: string
          game_key?: string
          id?: string
          status?: string
          week_end: string
          week_start: string
        }
        Update: {
          created_at?: string
          game_key?: string
          id?: string
          status?: string
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          attempts_total: number
          attempts_used: number
          challenge_code: string | null
          created_at: string
          currency: string
          id: string
          metadata: Json
          profile_id: string | null
          provider: string
          provider_payment_id: string | null
          status: string
          test_mode: boolean
          updated_at: string
        }
        Insert: {
          amount: number
          attempts_total?: number
          attempts_used?: number
          challenge_code?: string | null
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          profile_id?: string | null
          provider?: string
          provider_payment_id?: string | null
          status?: string
          test_mode?: boolean
          updated_at?: string
        }
        Update: {
          amount?: number
          attempts_total?: number
          attempts_used?: number
          challenge_code?: string | null
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          profile_id?: string | null
          provider?: string
          provider_payment_id?: string | null
          status?: string
          test_mode?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_achievements: {
        Row: {
          achievement_id: string
          created_at: string
          id: string
          profile_id: string
        }
        Insert: {
          achievement_id: string
          created_at?: string
          id?: string
          profile_id: string
        }
        Update: {
          achievement_id?: string
          created_at?: string
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_achievements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_seed: string
          best_score: number
          country: string | null
          created_at: string
          games_played: number
          id: string
          nickname: string
          secret_hash: string
          updated_at: string
        }
        Insert: {
          avatar_seed?: string
          best_score?: number
          country?: string | null
          created_at?: string
          games_played?: number
          id?: string
          nickname: string
          secret_hash: string
          updated_at?: string
        }
        Update: {
          avatar_seed?: string
          best_score?: number
          country?: string | null
          created_at?: string
          games_played?: number
          id?: string
          nickname?: string
          secret_hash?: string
          updated_at?: string
        }
        Relationships: []
      }
      scores: {
        Row: {
          country_rank: number | null
          created_at: string
          game_session_id: string | null
          global_rank: number | null
          id: string
          profile_id: string
          score: number
          status: string
          verification_status: string | null
          verified_at: string | null
        }
        Insert: {
          country_rank?: number | null
          created_at?: string
          game_session_id?: string | null
          global_rank?: number | null
          id?: string
          profile_id: string
          score: number
          status?: string
          verification_status?: string | null
          verified_at?: string | null
        }
        Update: {
          country_rank?: number | null
          created_at?: string
          game_session_id?: string | null
          global_rank?: number | null
          id?: string
          profile_id?: string
          score?: number
          status?: string
          verification_status?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scores_game_session_id_fkey"
            columns: ["game_session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_auctions: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          min_bid: number
          min_increment: number
          starts_at: string
          status: string
          week_id: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          min_bid?: number
          min_increment?: number
          starts_at: string
          status?: string
          week_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          min_bid?: number
          min_increment?: number
          starts_at?: string
          status?: string
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_auctions_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: true
            referencedRelation: "game_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_bids: {
        Row: {
          amount: number
          auction_id: string
          created_at: string
          id: string
          is_active: boolean
          payment_reference: string | null
          payment_status: string
          reward_description: string
          sponsor_contact: string
          sponsor_name: string
        }
        Insert: {
          amount: number
          auction_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          payment_reference?: string | null
          payment_status?: string
          reward_description: string
          sponsor_contact: string
          sponsor_name: string
        }
        Update: {
          amount?: number
          auction_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          payment_reference?: string | null
          payment_status?: string
          reward_description?: string
          sponsor_contact?: string
          sponsor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_bids_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "sponsor_auctions"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_results: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          rank: number
          reward_description: string | null
          score: number
          sponsor_bid_id: string | null
          week_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          rank: number
          reward_description?: string | null
          score: number
          sponsor_bid_id?: string | null
          week_id: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          rank?: number
          reward_description?: string | null
          score?: number
          sponsor_bid_id?: string | null
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_results_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_results_sponsor_bid_id_fkey"
            columns: ["sponsor_bid_id"]
            isOneToOne: false
            referencedRelation: "sponsor_bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_results_sponsor_bid_id_fkey"
            columns: ["sponsor_bid_id"]
            isOneToOne: false
            referencedRelation: "sponsor_standings"
            referencedColumns: ["bid_id"]
          },
          {
            foreignKeyName: "weekly_results_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "game_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      sponsor_standings: {
        Row: {
          amount: number | null
          auction_id: string | null
          bid_id: string | null
          created_at: string | null
          reward_description: string | null
          sponsor_name: string | null
        }
        Insert: {
          amount?: number | null
          auction_id?: string | null
          bid_id?: string | null
          created_at?: string | null
          reward_description?: string | null
          sponsor_name?: string | null
        }
        Update: {
          amount?: number | null
          auction_id?: string | null
          bid_id?: string | null
          created_at?: string | null
          reward_description?: string | null
          sponsor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_bids_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "sponsor_auctions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      consume_attempt: {
        Args: {
          p_game_version: string
          p_profile_id: string
          p_session_token_hash: string
        }
        Returns: Json
      }
      get_weekly_leaderboard: {
        Args: { p_limit?: number; p_week_id: string }
        Returns: {
          best_score: number
          country: string
          nickname: string
          profile_id: string
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
  public: {
    Enums: {},
  },
} as const
