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
      coverage_submissions: {
        Row: {
          campaign: string | null
          created_at: string
          id: string
          mode: string
          row_count: number
          sheet_id: string
          sheet_tab: string
          user_id: string
        }
        Insert: {
          campaign?: string | null
          created_at?: string
          id?: string
          mode: string
          row_count: number
          sheet_id: string
          sheet_tab: string
          user_id: string
        }
        Update: {
          campaign?: string | null
          created_at?: string
          id?: string
          mode?: string
          row_count?: number
          sheet_id?: string
          sheet_tab?: string
          user_id?: string
        }
        Relationships: []
      }
      coverage_tracker_publication_group_members: {
        Row: {
          created_at: string
          group_id: string
          id: string
          value: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          value: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "coverage_tracker_publication_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "coverage_tracker_publication_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      coverage_tracker_publication_groups: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          note: string | null
          org_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          note?: string | null
          org_id?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          note?: string | null
          org_id?: string
        }
        Relationships: []
      }
      coverage_tracker_rules: {
        Row: {
          created_at: string
          created_by: string | null
          enabled: boolean
          id: string
          if_field: string
          if_group_id: string | null
          if_operator: string
          if_value: string | null
          note: string | null
          org_id: string
          rule_type: string
          sort_order: number
          then_field: string
          then_value: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          if_field: string
          if_group_id?: string | null
          if_operator: string
          if_value?: string | null
          note?: string | null
          org_id?: string
          rule_type: string
          sort_order?: number
          then_field: string
          then_value: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          if_field?: string
          if_group_id?: string | null
          if_operator?: string
          if_value?: string | null
          note?: string | null
          org_id?: string
          rule_type?: string
          sort_order?: number
          then_field?: string
          then_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "coverage_tracker_rules_group_fk"
            columns: ["if_group_id"]
            isOneToOne: false
            referencedRelation: "coverage_tracker_publication_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      coverage_tracker_settings: {
        Row: {
          id: string
          org_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          org_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      drive_tokens: {
        Row: {
          created_at: string
          refresh_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          refresh_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          refresh_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company: string | null
          created_at: string | null
          full_name: string | null
          id: string
          tier: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          tier?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          tier?: string | null
        }
        Relationships: []
      }
      streamtime_settings: {
        Row: {
          ooo_phrase: string
          org_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          ooo_phrase?: string
          org_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          ooo_phrase?: string
          org_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      streamtime_user_targets: {
        Row: {
          display_name: string
          id: string
          org_id: string
          streamtime_user_id: string
          target_pct: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          display_name: string
          id?: string
          org_id?: string
          streamtime_user_id: string
          target_pct: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          display_name?: string
          id?: string
          org_id?: string
          streamtime_user_id?: string
          target_pct?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      streamtime_weekly_reports: {
        Row: {
          date_from: string
          date_to: string
          entry_count: number
          id: string
          org_id: string
          saved_at: string | null
          saved_by: string | null
        }
        Insert: {
          date_from: string
          date_to: string
          entry_count?: number
          id?: string
          org_id?: string
          saved_at?: string | null
          saved_by?: string | null
        }
        Update: {
          date_from?: string
          date_to?: string
          entry_count?: number
          id?: string
          org_id?: string
          saved_at?: string | null
          saved_by?: string | null
        }
        Relationships: []
      }
      streamtime_weekly_user_stats: {
        Row: {
          billable_hours: number
          billable_pct: number
          capacity_hours: number
          diff_pct: number | null
          display_name: string
          id: string
          is_leadership: boolean
          non_billable_hours: number
          ooo_hours: number
          report_id: string
          streamtime_user_id: string
          target_pct: number | null
          team: string
          total_hours: number
          working_hours: number
        }
        Insert: {
          billable_hours?: number
          billable_pct?: number
          capacity_hours?: number
          diff_pct?: number | null
          display_name: string
          id?: string
          is_leadership?: boolean
          non_billable_hours?: number
          ooo_hours?: number
          report_id: string
          streamtime_user_id: string
          target_pct?: number | null
          team: string
          total_hours?: number
          working_hours?: number
        }
        Update: {
          billable_hours?: number
          billable_pct?: number
          capacity_hours?: number
          diff_pct?: number | null
          display_name?: string
          id?: string
          is_leadership?: boolean
          non_billable_hours?: number
          ooo_hours?: number
          report_id?: string
          streamtime_user_id?: string
          target_pct?: number | null
          team?: string
          total_hours?: number
          working_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "streamtime_weekly_user_stats_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "streamtime_weekly_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_access: {
        Row: {
          expires_at: string | null
          granted_at: string | null
          id: string
          plan: string | null
          tool_slug: string
          user_id: string | null
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string | null
          id?: string
          plan?: string | null
          tool_slug: string
          user_id?: string | null
        }
        Update: {
          expires_at?: string | null
          granted_at?: string | null
          id?: string
          plan?: string | null
          tool_slug?: string
          user_id?: string | null
        }
        Relationships: []
      }
      tool_access_requests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          status: string
          tool_slug: string
          user_email: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          status?: string
          tool_slug: string
          user_email?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          status?: string
          tool_slug?: string
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          role: string
          user_id: string
        }
        Insert: {
          role: string
          user_id: string
        }
        Update: {
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
