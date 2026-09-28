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
      inventory_items: {
        Row: {
          category: string
          created_at: string
          id: string
          item_name: string
          location: string
          make: string
          model: string
          qty_in_stock: number
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          item_name: string
          location?: string
          make?: string
          model?: string
          qty_in_stock?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          item_name?: string
          location?: string
          make?: string
          model?: string
          qty_in_stock?: number
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      inward_order_attachments: {
        Row: {
          content_type: string | null
          created_at: string
          file_name: string
          file_size: number
          id: string
          inward_order_id: string
          storage_path: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          file_name: string
          file_size?: number
          id?: string
          inward_order_id: string
          storage_path: string
        }
        Update: {
          content_type?: string | null
          created_at?: string
          file_name?: string
          file_size?: number
          id?: string
          inward_order_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "inward_order_attachments_inward_order_id_fkey"
            columns: ["inward_order_id"]
            isOneToOne: false
            referencedRelation: "inward_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      inward_orders: {
        Row: {
          created_at: string
          customer_name: string
          dispatch_date: string | null
          due_date: string | null
          id: string
          inspection_date: string | null
          po_date: string | null
          po_number: string | null
          project_id: string
          project_name: string
          project_number: string
          qa_officer: string
          readiness_date: string
          status: string
          supervisor: string
        }
        Insert: {
          created_at?: string
          customer_name?: string
          dispatch_date?: string | null
          due_date?: string | null
          id: string
          inspection_date?: string | null
          po_date?: string | null
          po_number?: string | null
          project_id: string
          project_name?: string
          project_number: string
          qa_officer: string
          readiness_date: string
          status?: string
          supervisor: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          dispatch_date?: string | null
          due_date?: string | null
          id?: string
          inspection_date?: string | null
          po_date?: string | null
          po_number?: string | null
          project_id?: string
          project_name?: string
          project_number?: string
          qa_officer?: string
          readiness_date?: string
          status?: string
          supervisor?: string
        }
        Relationships: []
      }
      procurement_items: {
        Row: {
          category: string
          created_at: string
          display_order: number
          enquiry_date: string | null
          expected_date: string | null
          id: string
          inward_order_id: string
          item_name: string
          make: string
          model: string
          notes: string
          qty_in_stock: number | null
          qty_received: number
          qty_required: number
          received_at: string | null
          specification: string
          stock_checked_at: string | null
          stock_checked_by: string
          supplier: string
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          display_order?: number
          enquiry_date?: string | null
          expected_date?: string | null
          id?: string
          inward_order_id: string
          item_name: string
          make?: string
          model?: string
          notes?: string
          qty_in_stock?: number | null
          qty_received?: number
          qty_required?: number
          received_at?: string | null
          specification?: string
          stock_checked_at?: string | null
          stock_checked_by?: string
          supplier?: string
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          display_order?: number
          enquiry_date?: string | null
          expected_date?: string | null
          id?: string
          inward_order_id?: string
          item_name?: string
          make?: string
          model?: string
          notes?: string
          qty_in_stock?: number | null
          qty_received?: number
          qty_required?: number
          received_at?: string | null
          specification?: string
          stock_checked_at?: string | null
          stock_checked_by?: string
          supplier?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "procurement_items_inward_order_id_fkey"
            columns: ["inward_order_id"]
            isOneToOne: false
            referencedRelation: "inward_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      project_stages: {
        Row: {
          assigned_to: string
          created_at: string
          display_order: number
          expected_date: string | null
          id: string
          inward_order_id: string
          remarks: string
          stage_name: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string
          created_at?: string
          display_order: number
          expected_date?: string | null
          id?: string
          inward_order_id: string
          remarks?: string
          stage_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string
          created_at?: string
          display_order?: number
          expected_date?: string | null
          id?: string
          inward_order_id?: string
          remarks?: string
          stage_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_stages_inward_order_id_fkey"
            columns: ["inward_order_id"]
            isOneToOne: false
            referencedRelation: "inward_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_updates: {
        Row: {
          author: string
          content_type: string | null
          created_at: string
          file_name: string | null
          file_size: number
          id: string
          inward_order_id: string
          kind: string
          remarks: string
          stage_name: string
          status: string | null
          storage_path: string | null
        }
        Insert: {
          author?: string
          content_type?: string | null
          created_at?: string
          file_name?: string | null
          file_size?: number
          id?: string
          inward_order_id: string
          kind?: string
          remarks?: string
          stage_name: string
          status?: string | null
          storage_path?: string | null
        }
        Update: {
          author?: string
          content_type?: string | null
          created_at?: string
          file_name?: string | null
          file_size?: number
          id?: string
          inward_order_id?: string
          kind?: string
          remarks?: string
          stage_name?: string
          status?: string | null
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stage_updates_inward_order_id_fkey"
            columns: ["inward_order_id"]
            isOneToOne: false
            referencedRelation: "inward_orders"
            referencedColumns: ["id"]
          },
        ]
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
    Enums: {},
  },
} as const
