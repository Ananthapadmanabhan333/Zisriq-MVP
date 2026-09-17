export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      activity_events: {
        Row: {
          actor_token_id: string | null
          actor_user_id: string | null
          created_at: string
          firm_id: string
          id: number
          metadata: Json
          target_id: string | null
          target_type: string
          verb: string
        }
        Insert: {
          actor_token_id?: string | null
          actor_user_id?: string | null
          created_at?: string
          firm_id: string
          id?: never
          metadata?: Json
          target_id?: string | null
          target_type: string
          verb: string
        }
        Update: {
          actor_token_id?: string | null
          actor_user_id?: string | null
          created_at?: string
          firm_id?: string
          id?: never
          metadata?: Json
          target_id?: string | null
          target_type?: string
          verb?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_actor_token_id_fkey"
            columns: ["actor_token_id"]
            isOneToOne: false
            referencedRelation: "portal_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_events_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_template_items: {
        Row: {
          created_at: string
          description: string | null
          firm_id: string
          id: string
          is_mandatory: boolean
          label: string
          sort_order: number
          template_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          firm_id: string
          id?: string
          is_mandatory?: boolean
          label: string
          sort_order?: number
          template_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          firm_id?: string
          id?: string
          is_mandatory?: boolean
          label?: string
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_template_items_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          firm_id: string
          id: string
          is_archived: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          firm_id: string
          id?: string
          is_archived?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          firm_id?: string
          id?: string
          is_archived?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_templates_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          firm_id: string
          gstin: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          pan: string | null
          type: Database["public"]["Enums"]["zq_client_type"]
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          firm_id: string
          gstin?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          pan?: string | null
          type: Database["public"]["Enums"]["zq_client_type"]
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          firm_id?: string
          gstin?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          pan?: string | null
          type?: Database["public"]["Enums"]["zq_client_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          firm_id: string
          id: string
          mime_type: string
          original_filename: string
          request_item_id: string
          review_flags: Json | null
          review_status: Database["public"]["Enums"]["zq_doc_review"]
          reviewed_at: string | null
          reviewer_id: string | null
          reviewer_notes: string | null
          size_bytes: number
          sniffed_mime: string | null
          storage_path: string
          updated_at: string
          uploaded_by_token: string | null
          uploaded_by_user: string | null
        }
        Insert: {
          created_at?: string
          firm_id: string
          id?: string
          mime_type: string
          original_filename: string
          request_item_id: string
          review_flags?: Json | null
          review_status?: Database["public"]["Enums"]["zq_doc_review"]
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_notes?: string | null
          size_bytes: number
          sniffed_mime?: string | null
          storage_path: string
          updated_at?: string
          uploaded_by_token?: string | null
          uploaded_by_user?: string | null
        }
        Update: {
          created_at?: string
          firm_id?: string
          id?: string
          mime_type?: string
          original_filename?: string
          request_item_id?: string
          review_flags?: Json | null
          review_status?: Database["public"]["Enums"]["zq_doc_review"]
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_notes?: string | null
          size_bytes?: number
          sniffed_mime?: string | null
          storage_path?: string
          updated_at?: string
          uploaded_by_token?: string | null
          uploaded_by_user?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_token_fkey"
            columns: ["uploaded_by_token"]
            isOneToOne: false
            referencedRelation: "portal_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_user_fkey"
            columns: ["uploaded_by_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      firms: {
        Row: {
          ai_daily_cost_cap_cents: number
          ai_flags_enabled: boolean
          created_at: string
          email_sender_name: string
          id: string
          name: string
          portal_token_ttl_days: number
          reminder_follow_up_days: number[]
          reminder_overdue_cap: number
          reminder_overdue_every_days: number
          updated_at: string
        }
        Insert: {
          ai_daily_cost_cap_cents?: number
          ai_flags_enabled?: boolean
          created_at?: string
          email_sender_name?: string
          id?: string
          name: string
          portal_token_ttl_days?: number
          reminder_follow_up_days?: number[]
          reminder_overdue_cap?: number
          reminder_overdue_every_days?: number
          updated_at?: string
        }
        Update: {
          ai_daily_cost_cap_cents?: number
          ai_flags_enabled?: boolean
          created_at?: string
          email_sender_name?: string
          id?: string
          name?: string
          portal_token_ttl_days?: number
          reminder_follow_up_days?: number[]
          reminder_overdue_cap?: number
          reminder_overdue_every_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          firm_id: string
          id: string
          invited_by: string | null
          revoked_at: string | null
          role: Database["public"]["Enums"]["zq_role"]
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          firm_id: string
          id?: string
          invited_by?: string | null
          revoked_at?: string | null
          role: Database["public"]["Enums"]["zq_role"]
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          firm_id?: string
          id?: string
          invited_by?: string | null
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["zq_role"]
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          firm_id: string
          id: string
          role: Database["public"]["Enums"]["zq_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          firm_id: string
          id?: string
          role: Database["public"]["Enums"]["zq_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          firm_id?: string
          id?: string
          role?: Database["public"]["Enums"]["zq_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_tokens: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          firm_id: string
          id: string
          last_used_at: string | null
          request_id: string
          revoked_at: string | null
          revoked_by: string | null
          token_hash: string
          use_count: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at: string
          firm_id: string
          id?: string
          last_used_at?: string | null
          request_id: string
          revoked_at?: string | null
          revoked_by?: string | null
          token_hash: string
          use_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          firm_id?: string
          id?: string
          last_used_at?: string | null
          request_id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          token_hash?: string
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "portal_tokens_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_tokens_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_tokens_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_tokens_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_tokens_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          count: number
          key: string
          window_started_at: string
        }
        Insert: {
          count?: number
          key: string
          window_started_at?: string
        }
        Update: {
          count?: number
          key?: string
          window_started_at?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          channel: string
          created_at: string
          error: string | null
          firm_id: string
          id: string
          recipient_user_id: string | null
          request_id: string
          scheduled_for: string
          sent_at: string | null
          sequence_no: number
          status: Database["public"]["Enums"]["zq_reminder_status"]
          type: Database["public"]["Enums"]["zq_reminder_type"]
        }
        Insert: {
          channel?: string
          created_at?: string
          error?: string | null
          firm_id: string
          id?: string
          recipient_user_id?: string | null
          request_id: string
          scheduled_for: string
          sent_at?: string | null
          sequence_no?: number
          status?: Database["public"]["Enums"]["zq_reminder_status"]
          type: Database["public"]["Enums"]["zq_reminder_type"]
        }
        Update: {
          channel?: string
          created_at?: string
          error?: string | null
          firm_id?: string
          id?: string
          recipient_user_id?: string | null
          request_id?: string
          scheduled_for?: string
          sent_at?: string | null
          sequence_no?: number
          status?: Database["public"]["Enums"]["zq_reminder_status"]
          type?: Database["public"]["Enums"]["zq_reminder_type"]
        }
        Relationships: [
          {
            foreignKeyName: "reminders_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_enriched"
            referencedColumns: ["id"]
          },
        ]
      }
      request_items: {
        Row: {
          created_at: string
          description: string | null
          firm_id: string
          id: string
          is_mandatory: boolean
          label: string
          request_id: string
          sort_order: number
          status: Database["public"]["Enums"]["zq_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          firm_id: string
          id?: string
          is_mandatory?: boolean
          label: string
          request_id: string
          sort_order?: number
          status?: Database["public"]["Enums"]["zq_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          firm_id?: string
          id?: string
          is_mandatory?: boolean
          label?: string
          request_id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["zq_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_items_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_requests_enriched"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          assigned_to: string | null
          cancelled_at: string | null
          client_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          due_date: string | null
          firm_id: string
          id: string
          period_end: string | null
          period_label: string
          period_start: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["zq_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          cancelled_at?: string | null
          client_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          firm_id: string
          id?: string
          period_end?: string | null
          period_label: string
          period_start?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["zq_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          cancelled_at?: string | null
          client_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          firm_id?: string
          id?: string
          period_end?: string | null
          period_label?: string
          period_start?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["zq_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_requests_enriched: {
        Row: {
          all_mandatory_in: boolean | null
          assigned_to: string | null
          cancelled_at: string | null
          client_contact_email: string | null
          client_id: string | null
          client_name: string | null
          client_type: Database["public"]["Enums"]["zq_client_type"] | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          days_awaiting_client: number | null
          days_until_due: number | null
          due_date: string | null
          firm_id: string | null
          id: string | null
          is_overdue: boolean | null
          item_count: number | null
          mandatory_count: number | null
          mandatory_outstanding: number | null
          period_end: string | null
          period_label: string | null
          period_start: string | null
          received_count: number | null
          sent_at: string | null
          status: Database["public"]["Enums"]["zq_status"] | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_firm_with_owner: { Args: { p_name: string }; Returns: string }
      security_audit_tables: {
        Args: never
        Returns: {
          delete_policies: number
          has_firm_id: boolean
          insert_policies: number
          policy_count: number
          rls_enabled: boolean
          select_policies: number
          table_name: string
          update_policies: number
        }[]
      }
    }
    Enums: {
      zq_client_type:
        | "individual"
        | "proprietorship"
        | "partnership"
        | "company"
      zq_doc_review: "pending" | "approved" | "rejected" | "resupply_requested"
      zq_reminder_status: "scheduled" | "sent" | "failed" | "skipped"
      zq_reminder_type: "initial" | "follow_up" | "overdue" | "staff_digest"
      zq_role: "admin" | "accountant" | "staff"
      zq_status:
        | "requested"
        | "awaiting_client"
        | "received"
        | "under_review"
        | "completed"
        | "cancelled"
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
      zq_client_type: [
        "individual",
        "proprietorship",
        "partnership",
        "company",
      ],
      zq_doc_review: ["pending", "approved", "rejected", "resupply_requested"],
      zq_reminder_status: ["scheduled", "sent", "failed", "skipped"],
      zq_reminder_type: ["initial", "follow_up", "overdue", "staff_digest"],
      zq_role: ["admin", "accountant", "staff"],
      zq_status: [
        "requested",
        "awaiting_client",
        "received",
        "under_review",
        "completed",
        "cancelled",
      ],
    },
  },
} as const

