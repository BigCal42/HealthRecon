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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      account_plans: {
        Row: {
          created_at: string | null
          id: string
          summary: Json
          system_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          summary: Json
          system_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          summary?: Json
          system_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_plans_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string | null
          department: string | null
          email: string | null
          full_name: string
          id: string
          is_primary: boolean
          notes: string | null
          phone: string | null
          role_in_deal: string | null
          seniority: string | null
          system_id: string
          title: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_primary?: boolean
          notes?: string | null
          phone?: string | null
          role_in_deal?: string | null
          seniority?: string | null
          system_id: string
          title?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_primary?: boolean
          notes?: string | null
          phone?: string | null
          role_in_deal?: string | null
          seniority?: string | null
          system_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_briefing_runs: {
        Row: {
          briefing_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          status: string
          system_id: string
        }
        Insert: {
          briefing_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          status: string
          system_id: string
        }
        Update: {
          briefing_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          status?: string
          system_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_briefing_runs_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_briefings: {
        Row: {
          created_at: string | null
          id: string
          summary: string
          system_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          summary: string
          system_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          summary?: string
          system_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_briefings_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      document_embeddings: {
        Row: {
          created_at: string | null
          document_id: string
          embedding: string
          id: string
        }
        Insert: {
          created_at?: string | null
          document_id: string
          embedding: string
          id?: string
        }
        Update: {
          created_at?: string | null
          document_id?: string
          embedding?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_embeddings_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          crawled_at: string | null
          hash: string
          id: string
          processed: boolean
          raw_text: string | null
          source_type: string
          source_url: string
          system_id: string | null
          title: string | null
        }
        Insert: {
          crawled_at?: string | null
          hash: string
          id?: string
          processed?: boolean
          raw_text?: string | null
          source_type: string
          source_url: string
          system_id?: string | null
          title?: string | null
        }
        Update: {
          crawled_at?: string | null
          hash?: string
          id?: string
          processed?: boolean
          raw_text?: string | null
          source_type?: string
          source_url?: string
          system_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      entities: {
        Row: {
          attributes: Json | null
          created_at: string | null
          id: string
          name: string
          role: string | null
          source_document_id: string | null
          system_id: string | null
          type: string
        }
        Insert: {
          attributes?: Json | null
          created_at?: string | null
          id?: string
          name: string
          role?: string | null
          source_document_id?: string | null
          system_id?: string | null
          type: string
        }
        Update: {
          attributes?: Json | null
          created_at?: string | null
          id?: string
          name?: string
          role?: string | null
          source_document_id?: string | null
          system_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "entities_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entities_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          kind: string
          sentiment: string
          system_id: string
          target_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          kind: string
          sentiment: string
          system_id: string
          target_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          kind?: string
          sentiment?: string
          system_id?: string
          target_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      interactions: {
        Row: {
          channel: string
          created_at: string | null
          id: string
          next_step: string | null
          next_step_due_at: string | null
          occurred_at: string
          subject: string | null
          summary: string | null
          system_id: string
        }
        Insert: {
          channel: string
          created_at?: string | null
          id?: string
          next_step?: string | null
          next_step_due_at?: string | null
          occurred_at?: string
          subject?: string | null
          summary?: string | null
          system_id: string
        }
        Update: {
          channel?: string
          created_at?: string | null
          id?: string
          next_step?: string | null
          next_step_due_at?: string | null
          occurred_at?: string
          subject?: string | null
          summary?: string | null
          system_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactions_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      news_sources: {
        Row: {
          active: boolean
          created_at: string | null
          id: string
          name: string
          url: string
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          id?: string
          name: string
          url: string
        }
        Update: {
          active?: boolean
          created_at?: string | null
          id?: string
          name?: string
          url?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          amount: number | null
          close_date: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          priority: number | null
          probability: number | null
          source_id: string | null
          source_kind: string | null
          stage: string | null
          status: string
          system_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          close_date?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          priority?: number | null
          probability?: number | null
          source_id?: string | null
          source_kind?: string | null
          stage?: string | null
          status?: string
          system_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          close_date?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          priority?: number | null
          probability?: number | null
          source_id?: string | null
          source_kind?: string | null
          stage?: string | null
          status?: string
          system_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_suggestions: {
        Row: {
          accepted: boolean
          accepted_opportunity_id: string | null
          created_at: string | null
          description: string | null
          id: string
          source_ids: string[] | null
          source_kind: string
          system_id: string
          title: string
        }
        Insert: {
          accepted?: boolean
          accepted_opportunity_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          source_ids?: string[] | null
          source_kind: string
          system_id: string
          title: string
        }
        Update: {
          accepted?: boolean
          accepted_opportunity_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          source_ids?: string[] | null
          source_kind?: string
          system_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_suggestions_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      outbound_playbooks: {
        Row: {
          created_at: string | null
          id: string
          summary: Json
          system_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          summary: Json
          system_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          summary?: Json
          system_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outbound_playbooks_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_runs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          ingest_created: number | null
          process_processed: number | null
          status: string
          system_id: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          ingest_created?: number | null
          process_processed?: number | null
          status: string
          system_id: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          ingest_created?: number | null
          process_processed?: number | null
          status?: string
          system_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_runs_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      request_limits: {
        Row: {
          count: number
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          window_start: string
        }
        Insert: {
          count?: number
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          window_start: string
        }
        Update: {
          count?: number
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          window_start?: string
        }
        Relationships: []
      }
      sales_briefings: {
        Row: {
          created_at: string | null
          generated_for_date: string
          id: string
          summary: Json
        }
        Insert: {
          created_at?: string | null
          generated_for_date: string
          id?: string
          summary: Json
        }
        Update: {
          created_at?: string | null
          generated_for_date?: string
          id?: string
          summary?: Json
        }
        Relationships: []
      }
      signal_actions: {
        Row: {
          action_category: string
          action_description: string
          confidence: number
          created_at: string | null
          id: string
          signal_id: string
          system_id: string
        }
        Insert: {
          action_category: string
          action_description: string
          confidence: number
          created_at?: string | null
          id?: string
          signal_id: string
          system_id: string
        }
        Update: {
          action_category?: string
          action_description?: string
          confidence?: number
          created_at?: string | null
          id?: string
          signal_id?: string
          system_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signal_actions_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signal_actions_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      signals: {
        Row: {
          category: string
          created_at: string | null
          details: Json | null
          document_id: string | null
          id: string
          severity: string
          summary: string
          system_id: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          details?: Json | null
          document_id?: string | null
          id?: string
          severity: string
          summary: string
          system_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          details?: Json | null
          document_id?: string | null
          id?: string
          severity?: string
          summary?: string
          system_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signals_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signals_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      system_narratives: {
        Row: {
          created_at: string | null
          id: string
          narrative: Json
          system_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          narrative: Json
          system_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          narrative?: Json
          system_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_narratives_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      system_profiles: {
        Row: {
          created_at: string | null
          id: string
          summary: Json
          system_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          summary: Json
          system_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          summary?: Json
          system_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_profiles_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      system_seeds: {
        Row: {
          active: boolean
          created_at: string | null
          id: string
          label: string | null
          last_crawled_at: string | null
          priority: number | null
          system_id: string
          url: string
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          id?: string
          label?: string | null
          last_crawled_at?: string | null
          priority?: number | null
          system_id: string
          url: string
        }
        Update: {
          active?: boolean
          created_at?: string | null
          id?: string
          label?: string | null
          last_crawled_at?: string | null
          priority?: number | null
          system_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_seeds_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      systems: {
        Row: {
          created_at: string | null
          hq_city: string | null
          hq_state: string | null
          id: string
          name: string
          slug: string
          updated_at: string | null
          website: string | null
        }
        Insert: {
          created_at?: string | null
          hq_city?: string | null
          hq_state?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          created_at?: string | null
          hq_city?: string | null
          hq_state?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      work_items: {
        Row: {
          created_at: string | null
          description: string | null
          due_at: string | null
          id: string
          source_id: string
          source_type: string
          status: string
          system_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          source_id: string
          source_type: string
          status?: string
          system_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          source_id?: string
          source_type?: string
          status?: string
          system_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_items_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_request_limits: { Args: never; Returns: number }
      match_documents_for_system: {
        Args: {
          match_count?: number
          query_embedding: string
          system_id: string
        }
        Returns: {
          id: string
          raw_text: string
          similarity: number
          source_url: string
          system_id: string
          title: string
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

