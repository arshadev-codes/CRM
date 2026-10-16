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
    PostgrestVersion: "14.18"
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
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string
          at: string
          changes: Json
          id: number
          label: string
          order_id: string | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string
          at?: string
          changes?: Json
          id?: never
          label?: string
          order_id?: string | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string
          at?: string
          changes?: Json
          id?: never
          label?: string
          order_id?: string | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      commissioning_tasks: {
        Row: {
          assignee_ids: string[]
          assignees: Json
          completed_on: string | null
          confirmed_at: string | null
          confirmed_by: string
          created_at: string
          details: string
          display_order: number
          end_date: string | null
          id: string
          inward_order_id: string
          remarks: string
          start_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_ids?: string[]
          assignees?: Json
          completed_on?: string | null
          confirmed_at?: string | null
          confirmed_by?: string
          created_at?: string
          details?: string
          display_order?: number
          end_date?: string | null
          id?: string
          inward_order_id: string
          remarks?: string
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          assignee_ids?: string[]
          assignees?: Json
          completed_on?: string | null
          confirmed_at?: string | null
          confirmed_by?: string
          created_at?: string
          details?: string
          display_order?: number
          end_date?: string | null
          id?: string
          inward_order_id?: string
          remarks?: string
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissioning_tasks_inward_order_id_fkey"
            columns: ["inward_order_id"]
            isOneToOne: false
            referencedRelation: "inward_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      dcc_registry: {
        Row: {
          dcc: string
          email_error: string | null
          emailed_at: string | null
          inward_order_id: string | null
          issued_at: string
          panel_serial: string
          pdi_report_id: string
          project_number: string
        }
        Insert: {
          dcc: string
          email_error?: string | null
          emailed_at?: string | null
          inward_order_id?: string | null
          issued_at?: string
          panel_serial?: string
          pdi_report_id: string
          project_number?: string
        }
        Update: {
          dcc?: string
          email_error?: string | null
          emailed_at?: string | null
          inward_order_id?: string | null
          issued_at?: string
          panel_serial?: string
          pdi_report_id?: string
          project_number?: string
        }
        Relationships: []
      }
      device_tokens: {
        Row: {
          created_at: string
          id: string
          install_id: string | null
          platform: string
          token: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          install_id?: string | null
          platform?: string
          token?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          install_id?: string | null
          platform?: string
          token?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      dispatch_details: {
        Row: {
          checklist: Json
          delivered_on: string | null
          delivery_remarks: string
          destination: string
          dimensions: string
          dispatched_on: string | null
          driver_name: string
          driver_phone: string
          eway_bill_no: string
          expected_delivery: string | null
          gross_weight_kg: number | null
          incharge: string
          insurance: string
          invoice_no: string
          inward_order_id: string
          loading_method: string
          lr_number: string
          milestone: string
          notes: string
          packages_count: number | null
          packing_date: string | null
          packing_type: string
          planned_date: string | null
          received_by: string
          site_contact: string
          site_phone: string
          transport_mode: string
          transporter: string
          updated_at: string
          vehicle_no: string
        }
        Insert: {
          checklist?: Json
          delivered_on?: string | null
          delivery_remarks?: string
          destination?: string
          dimensions?: string
          dispatched_on?: string | null
          driver_name?: string
          driver_phone?: string
          eway_bill_no?: string
          expected_delivery?: string | null
          gross_weight_kg?: number | null
          incharge?: string
          insurance?: string
          invoice_no?: string
          inward_order_id: string
          loading_method?: string
          lr_number?: string
          milestone?: string
          notes?: string
          packages_count?: number | null
          packing_date?: string | null
          packing_type?: string
          planned_date?: string | null
          received_by?: string
          site_contact?: string
          site_phone?: string
          transport_mode?: string
          transporter?: string
          updated_at?: string
          vehicle_no?: string
        }
        Update: {
          checklist?: Json
          delivered_on?: string | null
          delivery_remarks?: string
          destination?: string
          dimensions?: string
          dispatched_on?: string | null
          driver_name?: string
          driver_phone?: string
          eway_bill_no?: string
          expected_delivery?: string | null
          gross_weight_kg?: number | null
          incharge?: string
          insurance?: string
          invoice_no?: string
          inward_order_id?: string
          loading_method?: string
          lr_number?: string
          milestone?: string
          notes?: string
          packages_count?: number | null
          packing_date?: string | null
          packing_type?: string
          planned_date?: string | null
          received_by?: string
          site_contact?: string
          site_phone?: string
          transport_mode?: string
          transporter?: string
          updated_at?: string
          vehicle_no?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_details_inward_order_id_fkey"
            columns: ["inward_order_id"]
            isOneToOne: true
            referencedRelation: "inward_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_ratings: {
        Row: {
          comment: string
          created_at: string
          employee_id: string
          id: string
          rated_by: string
          rated_by_id: string | null
          stars: number
          task_ref: Json | null
        }
        Insert: {
          comment?: string
          created_at?: string
          employee_id: string
          id?: string
          rated_by?: string
          rated_by_id?: string | null
          stars: number
          task_ref?: Json | null
        }
        Update: {
          comment?: string
          created_at?: string
          employee_id?: string
          id?: string
          rated_by?: string
          rated_by_id?: string | null
          stars?: number
          task_ref?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_ratings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_ratings_rated_by_id_fkey"
            columns: ["rated_by_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          active: boolean
          created_at: string
          department: string | null
          designation: string
          id: string
          joined_on: string | null
          name: string
          phone: string | null
          scope: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          department?: string | null
          designation?: string
          id: string
          joined_on?: string | null
          name: string
          phone?: string | null
          scope?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          department?: string | null
          designation?: string
          id?: string
          joined_on?: string | null
          name?: string
          phone?: string | null
          scope?: string
          updated_at?: string
        }
        Relationships: []
      }
      fabrication_jobs: {
        Row: {
          contact: string
          created_at: string
          description: string
          display_order: number
          expected_on: string | null
          given_by: string
          given_on: string | null
          id: string
          inward_order_id: string
          phase: string
          received_by: string
          received_on: string | null
          remarks: string
          updated_at: string
          vendor: string
        }
        Insert: {
          contact?: string
          created_at?: string
          description?: string
          display_order?: number
          expected_on?: string | null
          given_by?: string
          given_on?: string | null
          id?: string
          inward_order_id: string
          phase?: string
          received_by?: string
          received_on?: string | null
          remarks?: string
          updated_at?: string
          vendor?: string
        }
        Update: {
          contact?: string
          created_at?: string
          description?: string
          display_order?: number
          expected_on?: string | null
          given_by?: string
          given_on?: string | null
          id?: string
          inward_order_id?: string
          phase?: string
          received_by?: string
          received_on?: string | null
          remarks?: string
          updated_at?: string
          vendor?: string
        }
        Relationships: [
          {
            foreignKeyName: "fabrication_jobs_inward_order_id_fkey"
            columns: ["inward_order_id"]
            isOneToOne: false
            referencedRelation: "inward_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_outcomes: {
        Row: {
          decided_at: string | null
          decided_by: string
          inward_order_id: string
          outcome: string
          remarks: string
          report_name: string | null
          report_path: string | null
          updated_at: string
        }
        Insert: {
          decided_at?: string | null
          decided_by?: string
          inward_order_id: string
          outcome?: string
          remarks?: string
          report_name?: string | null
          report_path?: string | null
          updated_at?: string
        }
        Update: {
          decided_at?: string | null
          decided_by?: string
          inward_order_id?: string
          outcome?: string
          remarks?: string
          report_name?: string | null
          report_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_outcomes_inward_order_id_fkey"
            columns: ["inward_order_id"]
            isOneToOne: true
            referencedRelation: "inward_orders"
            referencedColumns: ["id"]
          },
        ]
      }
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
      mom_points: {
        Row: {
          action: string
          cause: string
          closed_at: string | null
          created_at: string
          description: string
          display_order: number
          due_date: string | null
          id: string
          inward_order_id: string
          owner: string
          point_type: string
          session_id: string
          status: string
          updated_at: string
        }
        Insert: {
          action?: string
          cause?: string
          closed_at?: string | null
          created_at?: string
          description?: string
          display_order?: number
          due_date?: string | null
          id?: string
          inward_order_id: string
          owner?: string
          point_type?: string
          session_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          action?: string
          cause?: string
          closed_at?: string | null
          created_at?: string
          description?: string
          display_order?: number
          due_date?: string | null
          id?: string
          inward_order_id?: string
          owner?: string
          point_type?: string
          session_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mom_points_inward_order_id_fkey"
            columns: ["inward_order_id"]
            isOneToOne: false
            referencedRelation: "inward_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mom_points_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "qa_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          dedupe_key: string
          id: string
          kind: string
          link: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          dedupe_key?: string
          id?: string
          kind?: string
          link?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          dedupe_key?: string
          id?: string
          kind?: string
          link?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      pdi_reports: {
        Row: {
          created_at: string
          customer_name: string
          dcc: string | null
          dcc_emailed_at: string | null
          declared: boolean
          email_verified_at: string | null
          id: string
          inspector_email: string
          inspector_name: string
          inward_order_id: string
          panel_category: string
          panel_name: string
          panel_serial: string
          project_number: string
          remarks: string
          responses: Json
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name?: string
          dcc?: string | null
          dcc_emailed_at?: string | null
          declared?: boolean
          email_verified_at?: string | null
          id?: string
          inspector_email?: string
          inspector_name?: string
          inward_order_id: string
          panel_category?: string
          panel_name?: string
          panel_serial?: string
          project_number?: string
          remarks?: string
          responses?: Json
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          dcc?: string | null
          dcc_emailed_at?: string | null
          declared?: boolean
          email_verified_at?: string | null
          id?: string
          inspector_email?: string
          inspector_name?: string
          inward_order_id?: string
          panel_category?: string
          panel_name?: string
          panel_serial?: string
          project_number?: string
          remarks?: string
          responses?: Json
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdi_reports_inward_order_id_fkey"
            columns: ["inward_order_id"]
            isOneToOne: false
            referencedRelation: "inward_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_items: {
        Row: {
          category: string
          consumable: boolean
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
          panel: string
          panel_id: string | null
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
          consumable?: boolean
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
          panel?: string
          panel_id?: string | null
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
          consumable?: boolean
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
          panel?: string
          panel_id?: string | null
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
          {
            foreignKeyName: "procurement_items_panel_id_fkey"
            columns: ["panel_id"]
            isOneToOne: false
            referencedRelation: "production_panels"
            referencedColumns: ["id"]
          },
        ]
      }
      production_panels: {
        Row: {
          assignee_ids: string[]
          created_at: string
          display_order: number
          id: string
          inward_order_id: string
          notes: string
          panel_type: string
          quantity: number
          tag: string
          updated_at: string
        }
        Insert: {
          assignee_ids?: string[]
          created_at?: string
          display_order?: number
          id?: string
          inward_order_id: string
          notes?: string
          panel_type?: string
          quantity?: number
          tag?: string
          updated_at?: string
        }
        Update: {
          assignee_ids?: string[]
          created_at?: string
          display_order?: number
          id?: string
          inward_order_id?: string
          notes?: string
          panel_type?: string
          quantity?: number
          tag?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_panels_inward_order_id_fkey"
            columns: ["inward_order_id"]
            isOneToOne: false
            referencedRelation: "inward_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      production_task_remarks: {
        Row: {
          author_id: string | null
          author_name: string
          body: string
          created_at: string
          id: string
          inward_order_id: string
          task_id: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string
          body: string
          created_at?: string
          id?: string
          inward_order_id: string
          task_id: string
        }
        Update: {
          author_id?: string | null
          author_name?: string
          body?: string
          created_at?: string
          id?: string
          inward_order_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_task_remarks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "production_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      production_tasks: {
        Row: {
          assignee_ids: string[]
          assignees: Json
          completed_on: string | null
          created_at: string
          display_order: number
          end_date: string | null
          id: string
          inward_order_id: string
          panel_id: string
          remarks: string
          start_date: string | null
          status: string
          updated_at: string
          work: string
        }
        Insert: {
          assignee_ids?: string[]
          assignees?: Json
          completed_on?: string | null
          created_at?: string
          display_order?: number
          end_date?: string | null
          id?: string
          inward_order_id: string
          panel_id: string
          remarks?: string
          start_date?: string | null
          status?: string
          updated_at?: string
          work?: string
        }
        Update: {
          assignee_ids?: string[]
          assignees?: Json
          completed_on?: string | null
          created_at?: string
          display_order?: number
          end_date?: string | null
          id?: string
          inward_order_id?: string
          panel_id?: string
          remarks?: string
          start_date?: string | null
          status?: string
          updated_at?: string
          work?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_tasks_inward_order_id_fkey"
            columns: ["inward_order_id"]
            isOneToOne: false
            referencedRelation: "inward_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_tasks_panel_id_fkey"
            columns: ["panel_id"]
            isOneToOne: false
            referencedRelation: "production_panels"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          employee_id: string | null
          id: string
          is_admin: boolean
          name: string
          permissions: string[]
          updated_at: string
          username: string
          view_permissions: string[]
        }
        Insert: {
          active?: boolean
          created_at?: string
          employee_id?: string | null
          id: string
          is_admin?: boolean
          name?: string
          permissions?: string[]
          updated_at?: string
          username: string
          view_permissions?: string[]
        }
        Update: {
          active?: boolean
          created_at?: string
          employee_id?: string | null
          id?: string
          is_admin?: boolean
          name?: string
          permissions?: string[]
          updated_at?: string
          username?: string
          view_permissions?: string[]
        }
        Relationships: []
      }
      project_stages: {
        Row: {
          assigned_to: string
          assignee_id: string | null
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
          assignee_id?: string | null
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
          assignee_id?: string | null
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
      projects: {
        Row: {
          company_short: string | null
          created_at: string
          data: Json
          fy: string | null
          id: string
          name: string
          offer_base: string | null
          offer_seq: number | null
          parent_id: string | null
          revision: number
          status: string
          updated_at: string
        }
        Insert: {
          company_short?: string | null
          created_at?: string
          data: Json
          fy?: string | null
          id: string
          name: string
          offer_base?: string | null
          offer_seq?: number | null
          parent_id?: string | null
          revision?: number
          status?: string
          updated_at?: string
        }
        Update: {
          company_short?: string | null
          created_at?: string
          data?: Json
          fy?: string | null
          id?: string
          name?: string
          offer_base?: string | null
          offer_seq?: number | null
          parent_id?: string | null
          revision?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      rating_rules: {
        Row: {
          created_at: string
          id: string
          rater_designation: string
          target: string
          target_kind: string
        }
        Insert: {
          created_at?: string
          id?: string
          rater_designation: string
          target: string
          target_kind: string
        }
        Update: {
          created_at?: string
          id?: string
          rater_designation?: string
          target?: string
          target_kind?: string
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
          user_agent: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string
          user_id?: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string
          user_id?: string
        }
        Relationships: []
      }
      qa_sessions: {
        Row: {
          client_attendees: Json
          created_at: string
          created_by: string
          id: string
          inward_order_id: string
          kind: string
          location: string
          session_date: string | null
          start_time: string
          status: string
          summary: string
          team: Json
          title: string
          updated_at: string
        }
        Insert: {
          client_attendees?: Json
          created_at?: string
          created_by?: string
          id?: string
          inward_order_id: string
          kind?: string
          location?: string
          session_date?: string | null
          start_time?: string
          status?: string
          summary?: string
          team?: Json
          title?: string
          updated_at?: string
        }
        Update: {
          client_attendees?: Json
          created_at?: string
          created_by?: string
          id?: string
          inward_order_id?: string
          kind?: string
          location?: string
          session_date?: string | null
          start_time?: string
          status?: string
          summary?: string
          team?: Json
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qa_sessions_inward_order_id_fkey"
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
          document_id: string | null
          file_name: string | null
          file_size: number
          id: string
          inward_order_id: string
          kind: string
          remarks: string
          stage_name: string
          status: string | null
          storage_path: string | null
          title: string
        }
        Insert: {
          author?: string
          content_type?: string | null
          created_at?: string
          document_id?: string | null
          file_name?: string | null
          file_size?: number
          id?: string
          inward_order_id: string
          kind?: string
          remarks?: string
          stage_name: string
          status?: string | null
          storage_path?: string | null
          title?: string
        }
        Update: {
          author?: string
          content_type?: string | null
          created_at?: string
          document_id?: string | null
          file_name?: string | null
          file_size?: number
          id?: string
          inward_order_id?: string
          kind?: string
          remarks?: string
          stage_name?: string
          status?: string | null
          storage_path?: string | null
          title?: string
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
      test_items: {
        Row: {
          created_at: string
          display_order: number
          id: string
          inward_order_id: string
          result_notes: string
          session_id: string | null
          status: string
          test_group: string
          test_key: string | null
          tested_by: string
          title: string
          updated_at: string
          witness_remarks: string
          witness_status: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          inward_order_id: string
          result_notes?: string
          session_id?: string | null
          status?: string
          test_group?: string
          test_key?: string | null
          tested_by?: string
          title: string
          updated_at?: string
          witness_remarks?: string
          witness_status?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          inward_order_id?: string
          result_notes?: string
          session_id?: string | null
          status?: string
          test_group?: string
          test_key?: string | null
          tested_by?: string
          title?: string
          updated_at?: string
          witness_remarks?: string
          witness_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_items_inward_order_id_fkey"
            columns: ["inward_order_id"]
            isOneToOne: false
            referencedRelation: "inward_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "qa_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      audit_diff: {
        Args: { a: Json; b: Json; nested?: boolean }
        Returns: Json
      }
      audit_enable: { Args: { t: unknown }; Returns: undefined }
      audit_merge: { Args: { newer: Json; older: Json }; Returns: Json }
      auth_setup_needed: { Args: never; Returns: boolean }
      can_edit: { Args: { perms: string[] }; Returns: boolean }
      can_rate: { Args: { p_employee: string }; Returns: boolean }
      can_edit_any: { Args: never; Returns: boolean }
      can_read_order: { Args: { o: string }; Returns: boolean }
      can_view: { Args: { p: string }; Returns: boolean }
      claim_app_install: { Args: { p_install: string }; Returns: undefined }
      employee_ids_for: {
        Args: { keep?: string[]; names: Json }
        Returns: string[]
      }
      full_view: { Args: never; Returns: boolean }
      has_perm: { Args: { p: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      issue_dcc: {
        Args: {
          p_order_id: string
          p_project?: string
          p_report_id: string
          p_serial?: string
        }
        Returns: string
      }
      log_event: { Args: { details?: Json; event: string }; Returns: undefined }
      my_employee_id: { Args: never; Returns: string }
      my_name: { Args: never; Returns: string }
      my_order_ids: { Args: never; Returns: string[] }
      my_panel_ids: { Args: never; Returns: string[] }
      notify_user: {
        Args: {
          p_body: string
          p_key: string
          p_kind: string
          p_link: string
          p_title: string
          p_user: string
          p_window?: string
        }
        Returns: undefined
      }
      order_people: { Args: { p_order: string }; Returns: string[] }
      release_app_install: { Args: { p_install: string }; Returns: undefined }
      save_device_token: {
        Args: { p_platform?: string; p_token: string }
        Returns: undefined
      }
      save_push_subscription: {
        Args: {
          p_agent: string
          p_auth: string
          p_endpoint: string
          p_p256dh: string
        }
        Returns: undefined
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
