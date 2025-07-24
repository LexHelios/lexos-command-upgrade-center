export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      agent_memory: {
        Row: {
          confidence_score: number | null
          created_at: string
          id: string
          key: string
          memory_type: string
          updated_at: string
          user_id: string
          value: Json
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          key: string
          memory_type: string
          updated_at?: string
          user_id: string
          value: Json
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          key?: string
          memory_type?: string
          updated_at?: string
          user_id?: string
          value?: Json
        }
        Relationships: []
      }
      api_usage: {
        Row: {
          cost_usd: number | null
          created_at: string
          endpoint: string
          error_message: string | null
          id: string
          metadata: Json | null
          model: string
          provider: string
          request_count: number | null
          response_time_ms: number | null
          success: boolean | null
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          cost_usd?: number | null
          created_at?: string
          endpoint: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          model: string
          provider: string
          request_count?: number | null
          response_time_ms?: number | null
          success?: boolean | null
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          cost_usd?: number | null
          created_at?: string
          endpoint?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          model?: string
          provider?: string
          request_count?: number | null
          response_time_ms?: number | null
          success?: boolean | null
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
          session_id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      cost_limits: {
        Row: {
          alert_threshold: number | null
          created_at: string
          current_month_spend: number | null
          hard_limit_reached: boolean | null
          id: string
          monthly_limit_usd: number | null
          reset_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_threshold?: number | null
          created_at?: string
          current_month_spend?: number | null
          hard_limit_reached?: boolean | null
          id?: string
          monthly_limit_usd?: number | null
          reset_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_threshold?: number | null
          created_at?: string
          current_month_spend?: number | null
          hard_limit_reached?: boolean | null
          id?: string
          monthly_limit_usd?: number | null
          reset_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          component: string | null
          context: Json | null
          created_at: string
          id: string
          level: string
          message: string
          stack_trace: string | null
          timestamp: string
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          component?: string | null
          context?: Json | null
          created_at?: string
          id?: string
          level: string
          message: string
          stack_trace?: string | null
          timestamp?: string
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          component?: string | null
          context?: Json | null
          created_at?: string
          id?: string
          level?: string
          message?: string
          stack_trace?: string | null
          timestamp?: string
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      h100_config: {
        Row: {
          auto_failover: boolean | null
          created_at: string | null
          fallback_to_cloud: boolean | null
          h100_api_key: string | null
          h100_endpoint: string | null
          health_check_interval: number | null
          id: string
          max_retry_attempts: number | null
          preferred_models: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_failover?: boolean | null
          created_at?: string | null
          fallback_to_cloud?: boolean | null
          h100_api_key?: string | null
          h100_endpoint?: string | null
          health_check_interval?: number | null
          id?: string
          max_retry_attempts?: number | null
          preferred_models?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_failover?: boolean | null
          created_at?: string | null
          fallback_to_cloud?: boolean | null
          h100_api_key?: string | null
          h100_endpoint?: string | null
          health_check_interval?: number | null
          id?: string
          max_retry_attempts?: number | null
          preferred_models?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      learning_experiences: {
        Row: {
          action_taken: string
          context: string
          created_at: string
          experience_type: string
          id: string
          importance_score: number | null
          lesson_learned: string | null
          outcome: string
          user_id: string
        }
        Insert: {
          action_taken: string
          context: string
          created_at?: string
          experience_type: string
          id?: string
          importance_score?: number | null
          lesson_learned?: string | null
          outcome: string
          user_id: string
        }
        Update: {
          action_taken?: string
          context?: string
          created_at?: string
          experience_type?: string
          id?: string
          importance_score?: number | null
          lesson_learned?: string | null
          outcome?: string
          user_id?: string
        }
        Relationships: []
      }
      model_pricing: {
        Row: {
          capabilities: Json | null
          cloud_fallback: boolean | null
          created_at: string
          h100_available: boolean | null
          h100_endpoint: string | null
          id: string
          input_cost_per_1k: number | null
          is_free: boolean | null
          is_self_hosted: boolean | null
          model: string
          output_cost_per_1k: number | null
          priority_order: number | null
          provider: string
          updated_at: string
        }
        Insert: {
          capabilities?: Json | null
          cloud_fallback?: boolean | null
          created_at?: string
          h100_available?: boolean | null
          h100_endpoint?: string | null
          id?: string
          input_cost_per_1k?: number | null
          is_free?: boolean | null
          is_self_hosted?: boolean | null
          model: string
          output_cost_per_1k?: number | null
          priority_order?: number | null
          provider: string
          updated_at?: string
        }
        Update: {
          capabilities?: Json | null
          cloud_fallback?: boolean | null
          created_at?: string
          h100_available?: boolean | null
          h100_endpoint?: string | null
          id?: string
          input_cost_per_1k?: number | null
          is_free?: boolean | null
          is_self_hosted?: boolean | null
          model?: string
          output_cost_per_1k?: number | null
          priority_order?: number | null
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_interactions: {
        Row: {
          data: Json
          id: string
          interaction_type: string
          timestamp: string
          user_id: string
        }
        Insert: {
          data: Json
          id?: string
          interaction_type: string
          timestamp?: string
          user_id: string
        }
        Update: {
          data?: Json
          id?: string
          interaction_type?: string
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          shadow_agent_access: boolean
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          shadow_agent_access?: boolean
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          shadow_agent_access?: boolean
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          communication_style: Json | null
          created_at: string
          goals: Json | null
          id: string
          name: string | null
          personality_traits: Json | null
          preferences: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          communication_style?: Json | null
          created_at?: string
          goals?: Json | null
          id?: string
          name?: string | null
          personality_traits?: Json | null
          preferences?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          communication_style?: Json | null
          created_at?: string
          goals?: Json | null
          id?: string
          name?: string | null
          personality_traits?: Json | null
          preferences?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_error_logs: {
        Args: { days_to_keep?: number }
        Returns: number
      }
      get_current_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_shadow_agent_access: {
        Args: { user_id?: string }
        Returns: boolean
      }
    }
    Enums: {
      user_role: "admin" | "shadow_agent" | "standard"
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
      user_role: ["admin", "shadow_agent", "standard"],
    },
  },
} as const
