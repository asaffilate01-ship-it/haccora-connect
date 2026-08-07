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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          idempotency_key: string | null
          location_id: string | null
          meta: Json | null
          organization_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          meta?: Json | null
          organization_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          meta?: Json | null
          organization_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_activity_logs_location_organization"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      alerts: {
        Row: {
          created_at: string
          id: string
          idempotency_key: string | null
          kind: string
          location_id: string | null
          message: string | null
          organization_id: string | null
          read_at: string | null
          severity: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          idempotency_key?: string | null
          kind: string
          location_id?: string | null
          message?: string | null
          organization_id?: string | null
          read_at?: string | null
          severity?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          idempotency_key?: string | null
          kind?: string
          location_id?: string | null
          message?: string | null
          organization_id?: string | null
          read_at?: string | null
          severity?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_alerts_location_organization"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      api_clients: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          last_used_at: string | null
          name: string
          organization_id: string
          public_key: string
          revoked_at: string | null
          scopes: string[]
          secret_hash: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          name: string
          organization_id?: string
          public_key: string
          revoked_at?: string | null
          scopes?: string[]
          secret_hash: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          name?: string
          organization_id?: string
          public_key?: string
          revoked_at?: string | null
          scopes?: string[]
          secret_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_check_schedules: {
        Row: {
          active: boolean
          asset_id: string
          created_at: string
          created_by: string
          event_type: string
          frequency_days: number
          id: string
          instructions: string | null
          last_completed_at: string | null
          location_id: string | null
          maximum_value: number | null
          measured_unit: string | null
          minimum_value: number | null
          name: string
          next_due_at: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          asset_id: string
          created_at?: string
          created_by?: string
          event_type?: string
          frequency_days: number
          id?: string
          instructions?: string | null
          last_completed_at?: string | null
          location_id?: string | null
          maximum_value?: number | null
          measured_unit?: string | null
          minimum_value?: number | null
          name: string
          next_due_at: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          asset_id?: string
          created_at?: string
          created_by?: string
          event_type?: string
          frequency_days?: number
          id?: string
          instructions?: string | null
          last_completed_at?: string | null
          location_id?: string | null
          maximum_value?: number | null
          measured_unit?: string | null
          minimum_value?: number | null
          name?: string
          next_due_at?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_check_schedules_asset_org"
            columns: ["asset_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "asset_check_schedules_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_check_schedules_location_org"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "asset_check_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_events: {
        Row: {
          asset_id: string
          corrective_action: string | null
          created_at: string
          event_type: string
          id: string
          idempotency_key: string | null
          location_id: string | null
          measured_unit: string | null
          measured_value: number | null
          next_due_at: string | null
          notes: string | null
          organization_id: string
          outcome: string
          recorded_at: string
          recorded_by: string
          recorded_by_name: string
          schedule_id: string | null
          title: string
        }
        Insert: {
          asset_id: string
          corrective_action?: string | null
          created_at?: string
          event_type: string
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          measured_unit?: string | null
          measured_value?: number | null
          next_due_at?: string | null
          notes?: string | null
          organization_id: string
          outcome: string
          recorded_at?: string
          recorded_by?: string
          recorded_by_name?: string
          schedule_id?: string | null
          title: string
        }
        Update: {
          asset_id?: string
          corrective_action?: string | null
          created_at?: string
          event_type?: string
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          measured_unit?: string | null
          measured_value?: number | null
          next_due_at?: string | null
          notes?: string | null
          organization_id?: string
          outcome?: string
          recorded_at?: string
          recorded_by?: string
          recorded_by_name?: string
          schedule_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_events_asset_org"
            columns: ["asset_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "asset_events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_events_location_org"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "asset_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_events_schedule_org"
            columns: ["schedule_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "asset_check_schedules"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      assets: {
        Row: {
          asset_code: string
          category: string | null
          created_at: string
          created_by: string | null
          id: string
          idempotency_key: string | null
          last_service_at: string | null
          location: string | null
          location_id: string | null
          manufacturer: string | null
          model: string | null
          name: string
          next_service_at: string | null
          notes: string | null
          organization_id: string | null
          purchase_date: string | null
          qr_token: string
          retired_at: string | null
          serial: string | null
          status: string
          updated_at: string
          warranty_expires_at: string | null
        }
        Insert: {
          asset_code: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string | null
          last_service_at?: string | null
          location?: string | null
          location_id?: string | null
          manufacturer?: string | null
          model?: string | null
          name: string
          next_service_at?: string | null
          notes?: string | null
          organization_id?: string | null
          purchase_date?: string | null
          qr_token?: string
          retired_at?: string | null
          serial?: string | null
          status?: string
          updated_at?: string
          warranty_expires_at?: string | null
        }
        Update: {
          asset_code?: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string | null
          last_service_at?: string | null
          location?: string | null
          location_id?: string | null
          manufacturer?: string | null
          model?: string | null
          name?: string
          next_service_at?: string | null
          notes?: string | null
          organization_id?: string | null
          purchase_date?: string | null
          qr_token?: string
          retired_at?: string | null
          serial?: string | null
          status?: string
          updated_at?: string
          warranty_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_assets_location_organization"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          after_data: Json | null
          before_data: Json | null
          entity: string
          entity_id: string | null
          id: string
          location_id: string | null
          occurred_at: string
          organization_id: string
          previous_hash: string | null
          record_hash: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
          location_id?: string | null
          occurred_at?: string
          organization_id: string
          previous_hash?: string | null
          record_hash: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
          location_id?: string | null
          occurred_at?: string
          organization_id?: string
          previous_hash?: string | null
          record_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_audit_event_location_organization"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      audits: {
        Row: {
          audit_type: string
          created_at: string
          id: string
          idempotency_key: string | null
          location_id: string | null
          notes: string | null
          organization_id: string | null
          performed_at: string
          performed_by: string | null
          score: number | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          audit_type?: string
          created_at?: string
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          notes?: string | null
          organization_id?: string | null
          performed_at?: string
          performed_by?: string | null
          score?: number | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          audit_type?: string
          created_at?: string
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          notes?: string | null
          organization_id?: string | null
          performed_at?: string
          performed_by?: string | null
          score?: number | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audits_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_audits_location_organization"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      backup_restore_drills: {
        Row: {
          completed_at: string | null
          created_at: string
          environment: string
          evidence_storage_path: string | null
          id: string
          notes: string | null
          organization_id: string
          performed_by: string
          recovery_point_minutes: number | null
          recovery_time_minutes: number | null
          started_at: string
          status: string
          verified_by: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          environment: string
          evidence_storage_path?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          performed_by: string
          recovery_point_minutes?: number | null
          recovery_time_minutes?: number | null
          started_at: string
          status?: string
          verified_by?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          environment?: string
          evidence_storage_path?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          performed_by?: string
          recovery_point_minutes?: number | null
          recovery_time_minutes?: number | null
          started_at?: string
          status?: string
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "backup_restore_drills_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          livemode: boolean
          occurred_at: string
          organization_id: string | null
          payload: Json
          payload_sha256: string
          processed_at: string | null
          processing_error: string | null
          processing_status: string
          provider: string
          provider_event_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          livemode?: boolean
          occurred_at: string
          organization_id?: string | null
          payload: Json
          payload_sha256: string
          processed_at?: string | null
          processing_error?: string | null
          processing_status?: string
          provider?: string
          provider_event_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          livemode?: boolean
          occurred_at?: string
          organization_id?: string | null
          payload?: Json
          payload_sha256?: string
          processed_at?: string | null
          processing_error?: string | null
          processing_status?: string
          provider?: string
          provider_event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      calibration_logs: {
        Row: {
          created_at: string
          deviation_c: number | null
          device: string
          id: string
          idempotency_key: string | null
          location_id: string | null
          measured_c: number | null
          method: string
          next_due: string | null
          notes: string | null
          organization_id: string | null
          passed: boolean
          performed_at: string
          performed_by: string | null
          reference_c: number | null
          serial_no: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deviation_c?: number | null
          device: string
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          measured_c?: number | null
          method?: string
          next_due?: string | null
          notes?: string | null
          organization_id?: string | null
          passed?: boolean
          performed_at?: string
          performed_by?: string | null
          reference_c?: number | null
          serial_no?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deviation_c?: number | null
          device?: string
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          measured_c?: number | null
          method?: string
          next_due?: string | null
          notes?: string | null
          organization_id?: string | null
          passed?: boolean
          performed_at?: string
          performed_by?: string | null
          reference_c?: number | null
          serial_no?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calibration_logs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calibration_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_calibration_logs_location_organization"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      checks: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          idempotency_key: string | null
          kind: string
          location_id: string | null
          note: string | null
          organization_id: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          kind: string
          location_id?: string | null
          note?: string | null
          organization_id?: string | null
          status?: string
          title: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          kind?: string
          location_id?: string | null
          note?: string | null
          organization_id?: string | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_checks_location_organization"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      chemicals: {
        Row: {
          created_at: string
          ghs_pictograms: string[] | null
          hazard_class: string | null
          id: string
          idempotency_key: string | null
          location_id: string | null
          name: string
          next_review: string | null
          notes: string | null
          organization_id: string | null
          ppe_required: string | null
          reviewed_on: string | null
          sds_url: string | null
          storage_location: string | null
          supplier: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ghs_pictograms?: string[] | null
          hazard_class?: string | null
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          name: string
          next_review?: string | null
          notes?: string | null
          organization_id?: string | null
          ppe_required?: string | null
          reviewed_on?: string | null
          sds_url?: string | null
          storage_location?: string | null
          supplier?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ghs_pictograms?: string[] | null
          hazard_class?: string | null
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          name?: string
          next_review?: string | null
          notes?: string | null
          organization_id?: string | null
          ppe_required?: string | null
          reviewed_on?: string | null
          sds_url?: string | null
          storage_location?: string | null
          supplier?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chemicals_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chemicals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_chemicals_location_organization"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      cleaning_completions: {
        Row: {
          completed_at: string
          completed_by: string
          created_at: string
          id: string
          idempotency_key: string | null
          location_id: string | null
          notes: string | null
          organization_id: string
          result: string
          task_area_snapshot: string
          task_id: string | null
        }
        Insert: {
          completed_at?: string
          completed_by: string
          created_at?: string
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          notes?: string | null
          organization_id: string
          result?: string
          task_area_snapshot: string
          task_id?: string | null
        }
        Update: {
          completed_at?: string
          completed_by?: string
          created_at?: string
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          notes?: string | null
          organization_id?: string
          result?: string
          task_area_snapshot?: string
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cleaning_completion_location_org"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "cleaning_completion_task_org"
            columns: ["task_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "cleaning_tasks"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "cleaning_completions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaning_completions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaning_completions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "cleaning_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      cleaning_tasks: {
        Row: {
          active: boolean
          area: string
          chemical: string | null
          colour_code: string | null
          contact_minutes: number | null
          created_at: string
          created_by: string
          frequency: string
          id: string
          instruction: string
          location_id: string | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          area: string
          chemical?: string | null
          colour_code?: string | null
          contact_minutes?: number | null
          created_at?: string
          created_by: string
          frequency?: string
          id?: string
          instruction: string
          location_id?: string | null
          organization_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          area?: string
          chemical?: string | null
          colour_code?: string | null
          contact_minutes?: number | null
          created_at?: string
          created_by?: string
          frequency?: string
          id?: string
          instruction?: string
          location_id?: string | null
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleaning_task_location_org"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "cleaning_tasks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaning_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          channel: string | null
          closed_at: string | null
          contact: string | null
          created_at: string
          description: string
          guest_name: string | null
          id: string
          idempotency_key: string | null
          kind: string
          location_id: string | null
          occurred_at: string
          organization_id: string | null
          resolution: string | null
          severity: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel?: string | null
          closed_at?: string | null
          contact?: string | null
          created_at?: string
          description: string
          guest_name?: string | null
          id?: string
          idempotency_key?: string | null
          kind?: string
          location_id?: string | null
          occurred_at?: string
          organization_id?: string | null
          resolution?: string | null
          severity?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: string | null
          closed_at?: string | null
          contact?: string | null
          created_at?: string
          description?: string
          guest_name?: string | null
          id?: string
          idempotency_key?: string | null
          kind?: string
          location_id?: string | null
          occurred_at?: string
          organization_id?: string | null
          resolution?: string | null
          severity?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaints_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_complaints_location_organization"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      compliance_content_versions: {
        Row: {
          body: Json
          content_key: string
          created_at: string
          id: string
          jurisdiction: string
          official_source_url: string
          published_at: string | null
          retired_at: string | null
          source_reviewed_at: string
          specialist_approved_at: string | null
          specialist_approved_by: string | null
          title: string
          version: string
        }
        Insert: {
          body?: Json
          content_key: string
          created_at?: string
          id?: string
          jurisdiction: string
          official_source_url: string
          published_at?: string | null
          retired_at?: string | null
          source_reviewed_at: string
          specialist_approved_at?: string | null
          specialist_approved_by?: string | null
          title: string
          version: string
        }
        Update: {
          body?: Json
          content_key?: string
          created_at?: string
          id?: string
          jurisdiction?: string
          official_source_url?: string
          published_at?: string | null
          retired_at?: string | null
          source_reviewed_at?: string
          specialist_approved_at?: string | null
          specialist_approved_by?: string | null
          title?: string
          version?: string
        }
        Relationships: []
      }
      contact_requests: {
        Row: {
          business_name: string | null
          consent_at: string
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          locale: string
          phone: string | null
          source_ip_hash: string
          status: string
          user_agent: string | null
        }
        Insert: {
          business_name?: string | null
          consent_at: string
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          locale?: string
          phone?: string | null
          source_ip_hash: string
          status?: string
          user_agent?: string | null
        }
        Update: {
          business_name?: string | null
          consent_at?: string
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          locale?: string
          phone?: string | null
          source_ip_hash?: string
          status?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      corrective_action_events: {
        Row: {
          action_id: string
          actor_id: string | null
          event_type: string
          id: string
          note: string | null
          occurred_at: string
          organization_id: string
          payload: Json
        }
        Insert: {
          action_id: string
          actor_id?: string | null
          event_type: string
          id?: string
          note?: string | null
          occurred_at?: string
          organization_id?: string
          payload?: Json
        }
        Update: {
          action_id?: string
          actor_id?: string | null
          event_type?: string
          id?: string
          note?: string | null
          occurred_at?: string
          organization_id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "corrective_action_events_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "corrective_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_action_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      corrective_actions: {
        Row: {
          category: string
          closed_at: string | null
          completed_at: string | null
          corrective_action: string | null
          created_at: string
          created_by: string
          description: string
          due_at: string | null
          escalated_at: string | null
          evidence: Json
          id: string
          immediate_action: string | null
          location_id: string | null
          organization_id: string
          owner_id: string | null
          preventive_action: string | null
          root_cause: string | null
          severity: string
          source_id: string
          source_table: string
          status: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          category?: string
          closed_at?: string | null
          completed_at?: string | null
          corrective_action?: string | null
          created_at?: string
          created_by?: string
          description: string
          due_at?: string | null
          escalated_at?: string | null
          evidence?: Json
          id?: string
          immediate_action?: string | null
          location_id?: string | null
          organization_id?: string
          owner_id?: string | null
          preventive_action?: string | null
          root_cause?: string | null
          severity?: string
          source_id: string
          source_table: string
          status?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          category?: string
          closed_at?: string | null
          completed_at?: string | null
          corrective_action?: string | null
          created_at?: string
          created_by?: string
          description?: string
          due_at?: string | null
          escalated_at?: string | null
          evidence?: Json
          id?: string
          immediate_action?: string | null
          location_id?: string | null
          organization_id?: string
          owner_id?: string | null
          preventive_action?: string | null
          root_cause?: string | null
          severity?: string
          source_id?: string
          source_table?: string
          status?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "corrective_actions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_actions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_corrective_location_organization"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      daily_diary_entries: {
        Row: {
          closing_checks: Json
          corrective_actions: string
          created_at: string
          created_by: string
          diary_date: string
          id: string
          location_id: string
          opening_checks: Json
          organization_id: string
          problems: string
          signed_off_at: string | null
          signed_off_by: string | null
          updated_at: string
        }
        Insert: {
          closing_checks?: Json
          corrective_actions?: string
          created_at?: string
          created_by?: string
          diary_date?: string
          id?: string
          location_id: string
          opening_checks?: Json
          organization_id: string
          problems?: string
          signed_off_at?: string | null
          signed_off_by?: string | null
          updated_at?: string
        }
        Update: {
          closing_checks?: Json
          corrective_actions?: string
          created_at?: string
          created_by?: string
          diary_date?: string
          id?: string
          location_id?: string
          opening_checks?: Json
          organization_id?: string
          problems?: string
          signed_off_at?: string | null
          signed_off_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_diary_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_diary_entries_organization_id_location_id_fkey"
            columns: ["organization_id", "location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      device_push_tokens: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          organization_id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          organization_id: string
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          organization_id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_push_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_push_token_membership"
            columns: ["organization_id", "user_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["organization_id", "user_id"]
          },
        ]
      }
      device_sessions: {
        Row: {
          assurance_level: string
          device_label: string
          first_seen_at: string
          id: string
          ip_hash: string | null
          last_seen_at: string
          organization_id: string
          platform: string
          revoked_at: string | null
          session_fingerprint: string
          user_agent_hash: string | null
          user_id: string
        }
        Insert: {
          assurance_level?: string
          device_label: string
          first_seen_at?: string
          id?: string
          ip_hash?: string | null
          last_seen_at?: string
          organization_id: string
          platform?: string
          revoked_at?: string | null
          session_fingerprint: string
          user_agent_hash?: string | null
          user_id: string
        }
        Update: {
          assurance_level?: string
          device_label?: string
          first_seen_at?: string
          id?: string
          ip_hash?: string | null
          last_seen_at?: string
          organization_id?: string
          platform?: string
          revoked_at?: string | null
          session_fingerprint?: string
          user_agent_hash?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          archived_at: string | null
          category: string
          created_at: string
          document_kind: string | null
          expires_at: string | null
          file_size: number | null
          file_url: string | null
          id: string
          idempotency_key: string | null
          issued_on: string | null
          location_id: string | null
          mime_type: string | null
          organization_id: string | null
          sha256: string | null
          storage_path: string | null
          subject_user_id: string | null
          title: string
          user_id: string
          version: string | null
        }
        Insert: {
          archived_at?: string | null
          category: string
          created_at?: string
          document_kind?: string | null
          expires_at?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          idempotency_key?: string | null
          issued_on?: string | null
          location_id?: string | null
          mime_type?: string | null
          organization_id?: string | null
          sha256?: string | null
          storage_path?: string | null
          subject_user_id?: string | null
          title: string
          user_id: string
          version?: string | null
        }
        Update: {
          archived_at?: string | null
          category?: string
          created_at?: string
          document_kind?: string | null
          expires_at?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          idempotency_key?: string | null
          issued_on?: string | null
          location_id?: string | null
          mime_type?: string | null
          organization_id?: string | null
          sha256?: string | null
          storage_path?: string | null
          subject_user_id?: string | null
          title?: string
          user_id?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_documents_location_organization"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      expiry_items: {
        Row: {
          batch: string | null
          created_at: string
          expires_on: string
          id: string
          idempotency_key: string | null
          location: string | null
          location_id: string | null
          name: string
          note: string | null
          organization_id: string | null
          qty: number | null
          status: string
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          batch?: string | null
          created_at?: string
          expires_on: string
          id?: string
          idempotency_key?: string | null
          location?: string | null
          location_id?: string | null
          name: string
          note?: string | null
          organization_id?: string | null
          qty?: number | null
          status?: string
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          batch?: string | null
          created_at?: string
          expires_on?: string
          id?: string
          idempotency_key?: string | null
          location?: string | null
          location_id?: string | null
          name?: string
          note?: string | null
          organization_id?: string | null
          qty?: number | null
          status?: string
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expiry_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expiry_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_expiry_items_location_organization"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      file_scan_jobs: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          document_id: string
          id: string
          last_error: string | null
          locked_at: string | null
          next_attempt_at: string
          organization_id: string
          provider_reference: string | null
          result: Json
          status: string
          storage_path: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          document_id: string
          id?: string
          last_error?: string | null
          locked_at?: string | null
          next_attempt_at?: string
          organization_id: string
          provider_reference?: string | null
          result?: Json
          status?: string
          storage_path: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          document_id?: string
          id?: string
          last_error?: string | null
          locked_at?: string | null
          next_attempt_at?: string
          organization_id?: string
          provider_reference?: string | null
          result?: Json
          status?: string
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_scan_jobs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_scan_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_in_logs: {
        Row: {
          allergen_label_ok: boolean | null
          batch_lot: string | null
          best_before: string | null
          condition_ok: boolean | null
          corrective_action: string | null
          created_at: string
          delivery_reference: string | null
          delivery_temp_c: number | null
          id: string
          idempotency_key: string | null
          location_id: string | null
          notes: string | null
          organization_id: string | null
          packaging_ok: boolean | null
          photo_url: string | null
          product: string
          quantity: number | null
          received_at: string
          status: string
          supplier: string
          temp_ok: boolean | null
          unit: string | null
          updated_at: string
          use_by: string | null
          user_id: string
        }
        Insert: {
          allergen_label_ok?: boolean | null
          batch_lot?: string | null
          best_before?: string | null
          condition_ok?: boolean | null
          corrective_action?: string | null
          created_at?: string
          delivery_reference?: string | null
          delivery_temp_c?: number | null
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          notes?: string | null
          organization_id?: string | null
          packaging_ok?: boolean | null
          photo_url?: string | null
          product: string
          quantity?: number | null
          received_at?: string
          status?: string
          supplier: string
          temp_ok?: boolean | null
          unit?: string | null
          updated_at?: string
          use_by?: string | null
          user_id: string
        }
        Update: {
          allergen_label_ok?: boolean | null
          batch_lot?: string | null
          best_before?: string | null
          condition_ok?: boolean | null
          corrective_action?: string | null
          created_at?: string
          delivery_reference?: string | null
          delivery_temp_c?: number | null
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          notes?: string | null
          organization_id?: string | null
          packaging_ok?: boolean | null
          photo_url?: string | null
          product?: string
          quantity?: number | null
          received_at?: string
          status?: string
          supplier?: string
          temp_ok?: boolean | null
          unit?: string | null
          updated_at?: string
          use_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_goods_in_logs_location_organization"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "goods_in_logs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_in_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      haccp_flow_runs: {
        Row: {
          captured_at: string | null
          ccp_unit: string | null
          ccp_value: number | null
          corrective_action: string | null
          created_at: string
          flow_key: string
          geo_accuracy: number | null
          geo_lat: number | null
          geo_lng: number | null
          id: string
          idempotency_key: string | null
          in_range: boolean | null
          location: string | null
          location_id: string | null
          notes: string | null
          organization_id: string | null
          performed_at: string
          performed_by: string | null
          photo_path: string | null
          product: string | null
          status: string
          steps: Json
          target_max: number | null
          target_min: number | null
          title: string
        }
        Insert: {
          captured_at?: string | null
          ccp_unit?: string | null
          ccp_value?: number | null
          corrective_action?: string | null
          created_at?: string
          flow_key: string
          geo_accuracy?: number | null
          geo_lat?: number | null
          geo_lng?: number | null
          id?: string
          idempotency_key?: string | null
          in_range?: boolean | null
          location?: string | null
          location_id?: string | null
          notes?: string | null
          organization_id?: string | null
          performed_at?: string
          performed_by?: string | null
          photo_path?: string | null
          product?: string | null
          status?: string
          steps?: Json
          target_max?: number | null
          target_min?: number | null
          title: string
        }
        Update: {
          captured_at?: string | null
          ccp_unit?: string | null
          ccp_value?: number | null
          corrective_action?: string | null
          created_at?: string
          flow_key?: string
          geo_accuracy?: number | null
          geo_lat?: number | null
          geo_lng?: number | null
          id?: string
          idempotency_key?: string | null
          in_range?: boolean | null
          location?: string | null
          location_id?: string | null
          notes?: string | null
          organization_id?: string | null
          performed_at?: string
          performed_by?: string | null
          photo_path?: string | null
          product?: string | null
          status?: string
          steps?: Json
          target_max?: number | null
          target_min?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_haccp_flow_runs_location_organization"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "haccp_flow_runs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "haccp_flow_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      haccp_hazards: {
        Row: {
          control: string
          corrective_action: string | null
          created_at: string
          created_by: string | null
          critical_limit: string | null
          hazard: string
          id: string
          idempotency_key: string | null
          is_ccp: boolean
          location_id: string | null
          monitoring: string | null
          organization_id: string | null
          status: string
          step: string
          updated_at: string
        }
        Insert: {
          control: string
          corrective_action?: string | null
          created_at?: string
          created_by?: string | null
          critical_limit?: string | null
          hazard: string
          id?: string
          idempotency_key?: string | null
          is_ccp?: boolean
          location_id?: string | null
          monitoring?: string | null
          organization_id?: string | null
          status?: string
          step: string
          updated_at?: string
        }
        Update: {
          control?: string
          corrective_action?: string | null
          created_at?: string
          created_by?: string | null
          critical_limit?: string | null
          hazard?: string
          id?: string
          idempotency_key?: string | null
          is_ccp?: boolean
          location_id?: string | null
          monitoring?: string | null
          organization_id?: string | null
          status?: string
          step?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_haccp_hazards_location_organization"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "haccp_hazards_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "haccp_hazards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      haccp_plan_versions: {
        Row: {
          approval_statement: string | null
          approved_at: string | null
          approved_by: string | null
          content_hash: string | null
          created_at: string
          created_by: string
          id: string
          location_id: string | null
          organization_id: string
          plan: Json
          status: string
          submitted_at: string | null
          submitted_by: string | null
          version: number
        }
        Insert: {
          approval_statement?: string | null
          approved_at?: string | null
          approved_by?: string | null
          content_hash?: string | null
          created_at?: string
          created_by?: string
          id?: string
          location_id?: string | null
          organization_id?: string
          plan: Json
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          version: number
        }
        Update: {
          approval_statement?: string | null
          approved_at?: string | null
          approved_by?: string | null
          content_hash?: string | null
          created_at?: string
          created_by?: string
          id?: string
          location_id?: string | null
          organization_id?: string
          plan?: Json
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_haccp_version_location_organization"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "haccp_plan_versions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "haccp_plan_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      health_register: {
        Row: {
          clearance_note: string | null
          cleared_at: string | null
          cleared_by: string | null
          created_at: string
          expires_on: string | null
          fitness_cleared_on: string | null
          id: string
          idempotency_key: string | null
          issued_on: string | null
          kind: string
          location_id: string | null
          notes: string | null
          organization_id: string | null
          reported_by: string
          staff_name: string
          status: string
          symptoms: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          clearance_note?: string | null
          cleared_at?: string | null
          cleared_by?: string | null
          created_at?: string
          expires_on?: string | null
          fitness_cleared_on?: string | null
          id?: string
          idempotency_key?: string | null
          issued_on?: string | null
          kind?: string
          location_id?: string | null
          notes?: string | null
          organization_id?: string | null
          reported_by?: string
          staff_name: string
          status?: string
          symptoms?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          clearance_note?: string | null
          cleared_at?: string | null
          cleared_by?: string | null
          created_at?: string
          expires_on?: string | null
          fitness_cleared_on?: string | null
          id?: string
          idempotency_key?: string | null
          issued_on?: string | null
          kind?: string
          location_id?: string | null
          notes?: string | null
          organization_id?: string | null
          reported_by?: string
          staff_name?: string
          status?: string
          symptoms?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_health_register_location_organization"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "health_register_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_register_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      high_risk_action_requests: {
        Row: {
          action: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_reason: string | null
          executed_at: string | null
          expires_at: string
          id: string
          organization_id: string
          payload: Json
          reason: string
          requested_by: string
          resource_id: string | null
          resource_type: string | null
          status: string
          updated_at: string
        }
        Insert: {
          action: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          executed_at?: string | null
          expires_at?: string
          id?: string
          organization_id: string
          payload?: Json
          reason: string
          requested_by: string
          resource_id?: string | null
          resource_type?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          action?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          executed_at?: string | null
          expires_at?: string
          id?: string
          organization_id?: string
          payload?: Json
          reason?: string
          requested_by?: string
          resource_id?: string | null
          resource_type?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "high_risk_action_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          closed_at: string | null
          created_at: string
          description: string | null
          evidence: Json
          id: string
          idempotency_key: string | null
          kind: string
          location_id: string | null
          occurred_at: string
          organization_id: string | null
          root_cause: string | null
          severity: string
          status: string
          title: string
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          description?: string | null
          evidence?: Json
          id?: string
          idempotency_key?: string | null
          kind: string
          location_id?: string | null
          occurred_at?: string
          organization_id?: string | null
          root_cause?: string | null
          severity?: string
          status?: string
          title: string
          user_id: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          description?: string | null
          evidence?: Json
          id?: string
          idempotency_key?: string | null
          kind?: string
          location_id?: string | null
          occurred_at?: string
          organization_id?: string | null
          root_cause?: string | null
          severity?: string
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_incidents_location_organization"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "incidents_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          allergens: string[]
          created_at: string
          id: string
          ingredient_statement: string | null
          may_contain: string[]
          name: string
          organization_id: string
          reviewed_at: string | null
          specification_document_id: string | null
          specification_version: string | null
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          allergens?: string[]
          created_at?: string
          id?: string
          ingredient_statement?: string | null
          may_contain?: string[]
          name: string
          organization_id?: string
          reviewed_at?: string | null
          specification_document_id?: string | null
          specification_version?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          allergens?: string[]
          created_at?: string
          id?: string
          ingredient_statement?: string | null
          may_contain?: string[]
          name?: string
          organization_id?: string
          reviewed_at?: string | null
          specification_document_id?: string | null
          specification_version?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_ingredient_document_organization"
            columns: ["specification_document_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "fk_ingredient_supplier_organization"
            columns: ["supplier_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "ingredients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredients_specification_document_id_fkey"
            columns: ["specification_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredients_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      inspector_access_grants: {
        Row: {
          created_at: string
          evidence_scopes: string[]
          granted_by: string
          id: string
          inspector_user_id: string
          location_ids: string[]
          organization_id: string
          reason: string | null
          revoked_at: string | null
          valid_from: string
          valid_until: string
        }
        Insert: {
          created_at?: string
          evidence_scopes?: string[]
          granted_by: string
          id?: string
          inspector_user_id: string
          location_ids: string[]
          organization_id: string
          reason?: string | null
          revoked_at?: string | null
          valid_from?: string
          valid_until: string
        }
        Update: {
          created_at?: string
          evidence_scopes?: string[]
          granted_by?: string
          id?: string
          inspector_user_id?: string
          location_ids?: string[]
          organization_id?: string
          reason?: string | null
          revoked_at?: string | null
          valid_from?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspector_access_grants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inspector_access_invitations: {
        Row: {
          accepted_at: string | null
          access_valid_until: string
          created_at: string
          email: string
          evidence_scopes: string[]
          expires_at: string
          id: string
          invited_by: string
          location_ids: string[]
          organization_id: string
          reason: string | null
          revoked_at: string | null
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          access_valid_until: string
          created_at?: string
          email: string
          evidence_scopes: string[]
          expires_at: string
          id?: string
          invited_by: string
          location_ids?: string[]
          organization_id: string
          reason?: string | null
          revoked_at?: string | null
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          access_valid_until?: string
          created_at?: string
          email?: string
          evidence_scopes?: string[]
          expires_at?: string
          id?: string
          invited_by?: string
          location_ids?: string[]
          organization_id?: string
          reason?: string | null
          revoked_at?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspector_access_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      label_prints: {
        Row: {
          allergens: string[]
          created_at: string
          id: string
          idempotency_key: string | null
          kind: string
          location_id: string | null
          organization_id: string | null
          printed_by: string | null
          product_name: string
          use_by: string | null
        }
        Insert: {
          allergens?: string[]
          created_at?: string
          id?: string
          idempotency_key?: string | null
          kind: string
          location_id?: string | null
          organization_id?: string | null
          printed_by?: string | null
          product_name: string
          use_by?: string | null
        }
        Update: {
          allergens?: string[]
          created_at?: string
          id?: string
          idempotency_key?: string | null
          kind?: string
          location_id?: string | null
          organization_id?: string | null
          printed_by?: string | null
          product_name?: string
          use_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_label_prints_location_organization"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "label_prints_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "label_prints_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_holds: {
        Row: {
          active: boolean
          created_at: string
          created_by: string
          id: string
          name: string
          organization_id: string
          reason: string
          released_at: string | null
          released_by: string | null
          scope: Json
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by: string
          id?: string
          name: string
          organization_id: string
          reason: string
          released_at?: string | null
          released_by?: string | null
          scope?: Json
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          organization_id?: string
          reason?: string
          released_at?: string | null
          released_by?: string | null
          scope?: Json
        }
        Relationships: [
          {
            foreignKeyName: "legal_holds_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: Json
          business_state: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: Json
          business_state?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: Json
          business_state?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_outbox: {
        Row: {
          attempts: number
          channel: string
          created_at: string
          id: string
          idempotency_key: string
          last_error: string | null
          next_attempt_at: string
          organization_id: string
          payload: Json
          processing_at: string | null
          recipient_id: string
          sent_at: string | null
          status: string
          template: string
        }
        Insert: {
          attempts?: number
          channel: string
          created_at?: string
          id?: string
          idempotency_key: string
          last_error?: string | null
          next_attempt_at?: string
          organization_id: string
          payload: Json
          processing_at?: string | null
          recipient_id: string
          sent_at?: string | null
          status?: string
          template: string
        }
        Update: {
          attempts?: number
          channel?: string
          created_at?: string
          id?: string
          idempotency_key?: string
          last_error?: string | null
          next_attempt_at?: string
          organization_id?: string
          payload?: Json
          processing_at?: string | null
          recipient_id?: string
          sent_at?: string | null
          status?: string
          template?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_outbox_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          critical_only: boolean
          email_enabled: boolean
          expiry_alerts_enabled: boolean
          issue_alerts_enabled: boolean
          organization_id: string
          push_enabled: boolean
          start_of_day_enabled: boolean
          start_of_day_local_time: string
          updated_at: string
          user_id: string
          weekly_digest: boolean
        }
        Insert: {
          critical_only?: boolean
          email_enabled?: boolean
          expiry_alerts_enabled?: boolean
          issue_alerts_enabled?: boolean
          organization_id: string
          push_enabled?: boolean
          start_of_day_enabled?: boolean
          start_of_day_local_time?: string
          updated_at?: string
          user_id: string
          weekly_digest?: boolean
        }
        Update: {
          critical_only?: boolean
          email_enabled?: boolean
          expiry_alerts_enabled?: boolean
          issue_alerts_enabled?: boolean
          organization_id?: string
          push_enabled?: boolean
          start_of_day_enabled?: boolean
          start_of_day_local_time?: string
          updated_at?: string
          user_id?: string
          weekly_digest?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "fk_notification_preference_membership"
            columns: ["organization_id", "user_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["organization_id", "user_id"]
          },
          {
            foreignKeyName: "notification_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      oil_tests: {
        Row: {
          changed: boolean | null
          created_at: string
          fryer: string
          id: string
          idempotency_key: string | null
          location_id: string | null
          notes: string | null
          organization_id: string | null
          status: string
          temperature_c: number | null
          tested_at: string
          tpm_percent: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          changed?: boolean | null
          created_at?: string
          fryer: string
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          notes?: string | null
          organization_id?: string | null
          status?: string
          temperature_c?: number | null
          tested_at?: string
          tpm_percent?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          changed?: boolean | null
          created_at?: string
          fryer?: string
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          notes?: string | null
          organization_id?: string | null
          status?: string
          temperature_c?: number | null
          tested_at?: string
          tpm_percent?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_oil_tests_location_organization"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "oil_tests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oil_tests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          revoked_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          organization_id: string
          revoked_at?: string | null
          role: Database["public"]["Enums"]["app_role"]
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          accepted_at: string | null
          created_at: string
          default_location_id: string | null
          id: string
          invited_by: string | null
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          default_location_id?: string | null
          id?: string
          invited_by?: string | null
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          default_location_id?: string | null
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_membership_location_organization"
            columns: ["default_location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "organization_memberships_default_location_id_fkey"
            columns: ["default_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          archived_at: string | null
          country_code: string
          created_at: string
          created_by: string | null
          enabled_modules: string[]
          id: string
          name: string
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          country_code?: string
          created_at?: string
          created_by?: string | null
          enabled_modules?: string[]
          id?: string
          name: string
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          country_code?: string
          created_at?: string
          created_by?: string | null
          enabled_modules?: string[]
          id?: string
          name?: string
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      pest_sightings: {
        Row: {
          action_taken: string | null
          contractor: string | null
          created_at: string
          id: string
          idempotency_key: string | null
          kind: string
          location: string | null
          location_id: string | null
          observed_at: string
          organization_id: string | null
          photo_url: string | null
          resolved_at: string | null
          severity: string
          species: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          action_taken?: string | null
          contractor?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          kind?: string
          location?: string | null
          location_id?: string | null
          observed_at?: string
          organization_id?: string | null
          photo_url?: string | null
          resolved_at?: string | null
          severity?: string
          species?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          action_taken?: string | null
          contractor?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          kind?: string
          location?: string | null
          location_id?: string | null
          observed_at?: string
          organization_id?: string | null
          photo_url?: string | null
          resolved_at?: string | null
          severity?: string
          species?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_pest_sightings_location_organization"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "pest_sightings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pest_sightings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ppds_label_versions: {
        Row: {
          allergens: string[]
          generated_at: string
          generated_by: string
          id: string
          ingredient_statement: string
          location_id: string
          organization_id: string
          product_name: string
          recipe_id: string | null
          source_snapshot: Json
          version: number
        }
        Insert: {
          allergens?: string[]
          generated_at?: string
          generated_by?: string
          id?: string
          ingredient_statement: string
          location_id: string
          organization_id: string
          product_name: string
          recipe_id?: string | null
          source_snapshot: Json
          version?: number
        }
        Update: {
          allergens?: string[]
          generated_at?: string
          generated_by?: string
          id?: string
          ingredient_statement?: string
          location_id?: string
          organization_id?: string
          product_name?: string
          recipe_id?: string | null
          source_snapshot?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "ppds_label_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ppds_label_versions_organization_id_location_id_fkey"
            columns: ["organization_id", "location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "ppds_label_versions_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      privacy_requests: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_notes: string | null
          details: string | null
          due_at: string
          export_storage_path: string | null
          id: string
          organization_id: string
          request_type: string
          requested_by: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          details?: string | null
          due_at?: string
          export_storage_path?: string | null
          id?: string
          organization_id: string
          request_type: string
          requested_by: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          details?: string | null
          due_at?: string
          export_storage_path?: string | null
          id?: string
          organization_id?: string
          request_type?: string
          requested_by?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "privacy_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          business_state: string | null
          created_at: string
          current_location_id: string | null
          current_organization_id: string | null
          deactivated_at: string | null
          email_alerts: boolean
          full_name: string | null
          id: string
          language: string
          location: string | null
          location_count: number | null
          onboarded_at: string | null
          push_alerts: boolean
          restaurant_name: string | null
          team_size: string | null
          updated_at: string
          vat_id: string | null
          vertical: string | null
          weekly_digest: boolean
        }
        Insert: {
          avatar_url?: string | null
          business_state?: string | null
          created_at?: string
          current_location_id?: string | null
          current_organization_id?: string | null
          deactivated_at?: string | null
          email_alerts?: boolean
          full_name?: string | null
          id: string
          language?: string
          location?: string | null
          location_count?: number | null
          onboarded_at?: string | null
          push_alerts?: boolean
          restaurant_name?: string | null
          team_size?: string | null
          updated_at?: string
          vat_id?: string | null
          vertical?: string | null
          weekly_digest?: boolean
        }
        Update: {
          avatar_url?: string | null
          business_state?: string | null
          created_at?: string
          current_location_id?: string | null
          current_organization_id?: string | null
          deactivated_at?: string | null
          email_alerts?: boolean
          full_name?: string | null
          id?: string
          language?: string
          location?: string | null
          location_count?: number | null
          onboarded_at?: string | null
          push_alerts?: boolean
          restaurant_name?: string | null
          team_size?: string | null
          updated_at?: string
          vat_id?: string | null
          vertical?: string | null
          weekly_digest?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "fk_profile_location_organization"
            columns: ["current_location_id", "current_organization_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "profiles_current_location_id_fkey"
            columns: ["current_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_current_organization_id_fkey"
            columns: ["current_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_lines: {
        Row: {
          created_at: string
          description: string
          id: string
          ingredient_id: string | null
          organization_id: string
          purchase_order_id: string
          quantity: number
          unit: string
          unit_price_eur: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          ingredient_id?: string | null
          organization_id?: string
          purchase_order_id: string
          quantity: number
          unit: string
          unit_price_eur?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          ingredient_id?: string | null
          organization_id?: string
          purchase_order_id?: string
          quantity?: number
          unit?: string
          unit_price_eur?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_po_line_ingredient_organization"
            columns: ["ingredient_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "fk_po_line_order_organization"
            columns: ["purchase_order_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "purchase_order_lines_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          expected_date: string | null
          id: string
          idempotency_key: string | null
          line_count: number
          location_id: string | null
          notes: string | null
          organization_id: string | null
          po_number: string
          status: string
          supplier: string
          total_eur: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          id?: string
          idempotency_key?: string | null
          line_count?: number
          location_id?: string | null
          notes?: string | null
          organization_id?: string | null
          po_number: string
          status?: string
          supplier: string
          total_eur?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          id?: string
          idempotency_key?: string | null
          line_count?: number
          location_id?: string | null
          notes?: string | null
          organization_id?: string | null
          po_number?: string
          status?: string
          supplier?: string
          total_eur?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_purchase_orders_location_organization"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "purchase_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_buckets: {
        Row: {
          bucket_key: string
          request_count: number
          updated_at: string
          window_started_at: string
        }
        Insert: {
          bucket_key: string
          request_count?: number
          updated_at?: string
          window_started_at?: string
        }
        Update: {
          bucket_key?: string
          request_count?: number
          updated_at?: string
          window_started_at?: string
        }
        Relationships: []
      }
      recall_drills: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          id: string
          location_id: string | null
          lot_code: string
          organization_id: string
          result: Json
          signed_off_by: string | null
          started_at: string | null
          status: string
          target_minutes: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          location_id?: string | null
          lot_code: string
          organization_id?: string
          result?: Json
          signed_off_by?: string | null
          started_at?: string | null
          status?: string
          target_minutes?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          location_id?: string | null
          lot_code?: string
          organization_id?: string
          result?: Json
          signed_off_by?: string | null
          started_at?: string | null
          status?: string
          target_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "recall_drills_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recall_drills_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      recalls: {
        Row: {
          batch: string | null
          created_at: string
          id: string
          idempotency_key: string | null
          initiated_at: string
          initiated_by: string | null
          location_id: string | null
          organization_id: string | null
          product: string
          reason: string
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          batch?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          initiated_at?: string
          initiated_by?: string | null
          location_id?: string | null
          organization_id?: string | null
          product: string
          reason: string
          severity?: string
          status?: string
          updated_at?: string
        }
        Update: {
          batch?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          initiated_at?: string
          initiated_by?: string | null
          location_id?: string | null
          organization_id?: string | null
          product?: string
          reason?: string
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_recalls_location_organization"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "recalls_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recalls_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          ingredient_id: string
          organization_id: string
          quantity: number
          recipe_id: string
          unit: string
        }
        Insert: {
          ingredient_id: string
          organization_id?: string
          quantity: number
          recipe_id: string
          unit: string
        }
        Update: {
          ingredient_id?: string
          organization_id?: string
          quantity?: number
          recipe_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_recipe_ingredient_item_organization"
            columns: ["ingredient_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "fk_recipe_ingredient_recipe_organization"
            columns: ["recipe_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "recipe_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          allergens: string[]
          category: string | null
          cost_eur: number
          created_at: string
          created_by: string | null
          flagged: boolean
          id: string
          idempotency_key: string | null
          location_id: string | null
          name: string
          notes: string | null
          organization_id: string | null
          price_eur: number
          updated_at: string
        }
        Insert: {
          allergens?: string[]
          category?: string | null
          cost_eur?: number
          created_at?: string
          created_by?: string | null
          flagged?: boolean
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          name: string
          notes?: string | null
          organization_id?: string | null
          price_eur?: number
          updated_at?: string
        }
        Update: {
          allergens?: string[]
          category?: string | null
          cost_eur?: number
          created_at?: string
          created_by?: string | null
          flagged?: boolean
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          name?: string
          notes?: string | null
          organization_id?: string | null
          price_eur?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_recipes_location_organization"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "recipes_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      regulatory_content_versions: {
        Row: {
          content: Json
          content_hash: string | null
          created_at: string
          effective_from: string | null
          effective_until: string | null
          id: string
          jurisdiction: string
          organization_id: string | null
          review_statement: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_url: string
          status: string
          topic: string
          version: number
        }
        Insert: {
          content: Json
          content_hash?: string | null
          created_at?: string
          effective_from?: string | null
          effective_until?: string | null
          id?: string
          jurisdiction: string
          organization_id?: string | null
          review_statement?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_url: string
          status?: string
          topic: string
          version: number
        }
        Update: {
          content?: Json
          content_hash?: string | null
          created_at?: string
          effective_from?: string | null
          effective_until?: string | null
          id?: string
          jurisdiction?: string
          organization_id?: string | null
          review_statement?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_url?: string
          status?: string
          topic?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_content_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      responsibility_assignments: {
        Row: {
          control_area: string
          created_at: string
          created_by: string
          escalation_contact: string | null
          evidence_document_id: string | null
          id: string
          location_id: string
          next_review_at: string | null
          notes: string | null
          organization_id: string
          party_name: string | null
          responsible_party: string
          updated_at: string
        }
        Insert: {
          control_area: string
          created_at?: string
          created_by?: string
          escalation_contact?: string | null
          evidence_document_id?: string | null
          id?: string
          location_id: string
          next_review_at?: string | null
          notes?: string | null
          organization_id: string
          party_name?: string | null
          responsible_party: string
          updated_at?: string
        }
        Update: {
          control_area?: string
          created_at?: string
          created_by?: string
          escalation_contact?: string | null
          evidence_document_id?: string | null
          id?: string
          location_id?: string
          next_review_at?: string | null
          notes?: string | null
          organization_id?: string
          party_name?: string | null
          responsible_party?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "responsibility_assignments_evidence_document_id_fkey"
            columns: ["evidence_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responsibility_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responsibility_assignments_organization_id_location_id_fkey"
            columns: ["organization_id", "location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      retention_policies: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          data_class: string
          deletion_mode: string
          id: string
          organization_id: string
          retain_days: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          data_class: string
          deletion_mode?: string
          id?: string
          organization_id: string
          retain_days: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          data_class?: string
          deletion_mode?: string
          id?: string
          organization_id?: string
          retain_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "retention_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      safe_method_templates: {
        Row: {
          category: string
          id: string
          official_source_url: string
          prompts: Json
          published_at: string
          summary: string
          title: string
          version: string
        }
        Insert: {
          category: string
          id: string
          official_source_url: string
          prompts?: Json
          published_at?: string
          summary: string
          title: string
          version: string
        }
        Update: {
          category?: string
          id?: string
          official_source_url?: string
          prompts?: Json
          published_at?: string
          summary?: string
          title?: string
          version?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          id: string
          ip_hash: string | null
          location_id: string | null
          metadata: Json
          occurred_at: string
          organization_id: string
          severity: string
          source: string
          user_agent_hash: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          ip_hash?: string | null
          location_id?: string | null
          metadata?: Json
          occurred_at?: string
          organization_id: string
          severity?: string
          source?: string
          user_agent_hash?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          ip_hash?: string | null
          location_id?: string | null
          metadata?: Json
          occurred_at?: string
          organization_id?: string
          severity?: string
          source?: string
          user_agent_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sensor_devices: {
        Row: {
          created_at: string
          created_by: string
          external_device_id: string
          id: string
          is_active: boolean
          last_seen_at: string | null
          location_id: string | null
          name: string
          organization_id: string
          secret_hash: string
          target_max: number
          target_min: number
        }
        Insert: {
          created_at?: string
          created_by?: string
          external_device_id: string
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          location_id?: string | null
          name: string
          organization_id: string
          secret_hash: string
          target_max: number
          target_min: number
        }
        Update: {
          created_at?: string
          created_by?: string
          external_device_id?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          location_id?: string | null
          name?: string
          organization_id?: string
          secret_hash?: string
          target_max?: number
          target_min?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_sensor_device_location_organization"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "sensor_devices_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sensor_devices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sensor_health_snapshots: {
        Row: {
          assessed_at: string
          device_id: string
          health: string
          id: string
          last_seen_at: string | null
          location_id: string | null
          missing_minutes: number
          organization_id: string
        }
        Insert: {
          assessed_at?: string
          device_id: string
          health: string
          id?: string
          last_seen_at?: string | null
          location_id?: string | null
          missing_minutes?: number
          organization_id: string
        }
        Update: {
          assessed_at?: string
          device_id?: string
          health?: string
          id?: string
          last_seen_at?: string | null
          location_id?: string | null
          missing_minutes?: number
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sensor_health_snapshots_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "sensor_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sensor_health_snapshots_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sensor_health_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sensor_readings: {
        Row: {
          captured_at: string
          device_id: string
          external_event_id: string
          id: string
          location_id: string | null
          organization_id: string
          raw_payload: Json
          reading: number
          received_at: string
          unit: string
        }
        Insert: {
          captured_at: string
          device_id: string
          external_event_id: string
          id?: string
          location_id?: string | null
          organization_id: string
          raw_payload?: Json
          reading: number
          received_at?: string
          unit?: string
        }
        Update: {
          captured_at?: string
          device_id?: string
          external_event_id?: string
          id?: string
          location_id?: string | null
          organization_id?: string
          raw_payload?: Json
          reading?: number
          received_at?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_sensor_reading_device_organization"
            columns: ["device_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "sensor_devices"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "fk_sensor_reading_location_organization"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "sensor_readings_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "sensor_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sensor_readings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sensor_readings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          created_at: string
          created_by: string | null
          end_time: string
          id: string
          idempotency_key: string | null
          location_id: string | null
          notes: string | null
          organization_id: string | null
          role_label: string | null
          shift_date: string
          staff_id: string | null
          staff_name: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_time: string
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          notes?: string | null
          organization_id?: string | null
          role_label?: string | null
          shift_date: string
          staff_id?: string | null
          staff_name: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_time?: string
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          notes?: string | null
          organization_id?: string | null
          role_label?: string | null
          shift_date?: string
          staff_id?: string | null
          staff_name?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_shifts_location_organization"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "shifts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      site_compliance_profiles: {
        Row: {
          approved_content_version: string | null
          business_type: string
          created_at: string
          jurisdiction: string
          local_authority_name: string | null
          location_id: string
          organization_id: string
          registration_confirmed_at: string | null
          registration_reference: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          serves_ppds: boolean
          serves_vulnerable_groups: boolean
          updated_at: string
        }
        Insert: {
          approved_content_version?: string | null
          business_type?: string
          created_at?: string
          jurisdiction: string
          local_authority_name?: string | null
          location_id: string
          organization_id: string
          registration_confirmed_at?: string | null
          registration_reference?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          serves_ppds?: boolean
          serves_vulnerable_groups?: boolean
          updated_at?: string
        }
        Update: {
          approved_content_version?: string | null
          business_type?: string
          created_at?: string
          jurisdiction?: string
          local_authority_name?: string | null
          location_id?: string
          organization_id?: string
          registration_confirmed_at?: string | null
          registration_reference?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          serves_ppds?: boolean
          serves_vulnerable_groups?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_compliance_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_compliance_profiles_organization_id_location_id_fkey"
            columns: ["organization_id", "location_id"]
            isOneToOne: true
            referencedRelation: "locations"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      site_safe_methods: {
        Row: {
          adopted_at: string | null
          adopted_by: string | null
          controls: Json
          created_at: string
          id: string
          location_id: string
          organization_id: string
          review_due_at: string | null
          status: string
          template_id: string
          updated_at: string
        }
        Insert: {
          adopted_at?: string | null
          adopted_by?: string | null
          controls?: Json
          created_at?: string
          id?: string
          location_id: string
          organization_id: string
          review_due_at?: string | null
          status?: string
          template_id: string
          updated_at?: string
        }
        Update: {
          adopted_at?: string | null
          adopted_by?: string | null
          controls?: Json
          created_at?: string
          id?: string
          location_id?: string
          organization_id?: string
          review_due_at?: string | null
          status?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_safe_methods_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_safe_methods_organization_id_location_id_fkey"
            columns: ["organization_id", "location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "site_safe_methods_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "safe_method_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_induction_assignments: {
        Row: {
          acknowledged_at: string | null
          acknowledgement_version: string
          assigned_by: string
          created_at: string
          due_at: string | null
          id: string
          instructions: string | null
          location_id: string | null
          organization_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledgement_version?: string
          assigned_by: string
          created_at?: string
          due_at?: string | null
          id?: string
          instructions?: string | null
          location_id?: string | null
          organization_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledgement_version?: string
          assigned_by?: string
          created_at?: string
          due_at?: string | null
          id?: string
          instructions?: string | null
          location_id?: string | null
          organization_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_induction_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_induction_location_org_fk"
            columns: ["organization_id", "location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "staff_induction_member_fk"
            columns: ["organization_id", "user_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["organization_id", "user_id"]
          },
        ]
      }
      stock_items: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          id: string
          idempotency_key: string | null
          location_id: string | null
          name: string
          organization_id: string | null
          par: number
          qty: number
          supplier: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          name: string
          organization_id?: string | null
          par?: number
          qty?: number
          supplier?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          name?: string
          organization_id?: string | null
          par?: number
          qty?: number
          supplier?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_stock_items_location_organization"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "stock_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          id: string
          idempotency_key: string | null
          location_id: string | null
          movement_type: string
          organization_id: string
          quantity: number
          recorded_at: string
          recorded_by: string
          reference_id: string | null
          reference_table: string | null
          stock_item_id: string
        }
        Insert: {
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          movement_type: string
          organization_id?: string
          quantity: number
          recorded_at?: string
          recorded_by?: string
          reference_id?: string | null
          reference_table?: string | null
          stock_item_id: string
        }
        Update: {
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          movement_type?: string
          organization_id?: string
          quantity?: number
          recorded_at?: string
          recorded_by?: string
          reference_id?: string | null
          reference_table?: string | null
          stock_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_stock_movement_item_organization"
            columns: ["stock_item_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "fk_stock_movement_location_organization"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "stock_movements_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_entitlements: {
        Row: {
          effective_from: string
          effective_until: string | null
          enabled: boolean
          entitlement: string
          limit_value: number | null
          organization_id: string
          source: string
          updated_at: string
        }
        Insert: {
          effective_from?: string
          effective_until?: string | null
          enabled?: boolean
          entitlement: string
          limit_value?: number | null
          organization_id: string
          source?: string
          updated_at?: string
        }
        Update: {
          effective_from?: string
          effective_until?: string | null
          enabled?: boolean
          entitlement?: string
          limit_value?: number | null
          organization_id?: string
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_entitlements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_email: string | null
          cancel_at_period_end: boolean
          currency: string
          current_period_end: string | null
          last_event_at: string | null
          organization_id: string
          plan: string
          provider_customer_id: string | null
          provider_subscription_id: string | null
          seats: number
          status: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          billing_email?: string | null
          cancel_at_period_end?: boolean
          currency?: string
          current_period_end?: string | null
          last_event_at?: string | null
          organization_id: string
          plan?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          seats?: number
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          billing_email?: string | null
          cancel_at_period_end?: boolean
          currency?: string
          current_period_end?: string | null
          last_event_at?: string | null
          organization_id?: string
          plan?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          seats?: number
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          category: string | null
          cert_expires_on: string | null
          contact: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          idempotency_key: string | null
          location_id: string | null
          name: string
          note: string | null
          organization_id: string | null
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          cert_expires_on?: string | null
          contact?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          name: string
          note?: string | null
          organization_id?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          cert_expires_on?: string | null
          contact?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          name?: string
          note?: string | null
          organization_id?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_suppliers_location_organization"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "suppliers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_conflicts: {
        Row: {
          client_mutation_id: string
          client_payload: Json
          created_at: string
          entity_id: string | null
          entity_table: string
          id: string
          organization_id: string
          resolution: Json | null
          resolved_at: string | null
          resolved_by: string | null
          server_payload: Json | null
          status: string
          user_id: string
        }
        Insert: {
          client_mutation_id: string
          client_payload: Json
          created_at?: string
          entity_id?: string | null
          entity_table: string
          id?: string
          organization_id: string
          resolution?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          server_payload?: Json | null
          status?: string
          user_id: string
        }
        Update: {
          client_mutation_id?: string
          client_payload?: Json
          created_at?: string
          entity_id?: string | null
          entity_table?: string
          id?: string
          organization_id?: string
          resolution?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          server_payload?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_conflicts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      temperature_logs: {
        Row: {
          created_at: string
          id: string
          idempotency_key: string | null
          location: string
          location_id: string | null
          logged_at: string
          note: string | null
          organization_id: string | null
          reading: number
          status: string
          target_max: number | null
          target_min: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          idempotency_key?: string | null
          location: string
          location_id?: string | null
          logged_at?: string
          note?: string | null
          organization_id?: string | null
          reading: number
          status?: string
          target_max?: number | null
          target_min?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          idempotency_key?: string | null
          location?: string
          location_id?: string | null
          logged_at?: string
          note?: string | null
          organization_id?: string | null
          reading?: number
          status?: string
          target_max?: number | null
          target_min?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_temperature_logs_location_organization"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "temperature_logs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temperature_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      time_clock: {
        Row: {
          clock_in: string
          clock_out: string | null
          created_at: string
          id: string
          idempotency_key: string | null
          location_id: string | null
          notes: string | null
          organization_id: string | null
          role_label: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          notes?: string | null
          organization_id?: string | null
          role_label?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          notes?: string | null
          organization_id?: string | null
          role_label?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_time_clock_location_organization"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "time_clock_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_clock_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      traceability_edges: {
        Row: {
          created_at: string
          created_by: string
          evidence: Json
          from_id: string
          from_type: string
          id: string
          location_id: string | null
          lot_code: string | null
          occurred_at: string
          organization_id: string
          quantity: number | null
          to_id: string
          to_type: string
          unit: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string
          evidence?: Json
          from_id: string
          from_type: string
          id?: string
          location_id?: string | null
          lot_code?: string | null
          occurred_at?: string
          organization_id?: string
          quantity?: number | null
          to_id: string
          to_type: string
          unit?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          evidence?: Json
          from_id?: string
          from_type?: string
          id?: string
          location_id?: string | null
          lot_code?: string | null
          occurred_at?: string
          organization_id?: string
          quantity?: number | null
          to_id?: string
          to_type?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "traceability_edges_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traceability_edges_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      training_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          completed_at: string | null
          course_version_id: string
          due_at: string | null
          id: string
          location_id: string | null
          organization_id: string
          score: number | null
          status: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string
          completed_at?: string | null
          course_version_id: string
          due_at?: string | null
          id?: string
          location_id?: string | null
          organization_id?: string
          score?: number | null
          status?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          completed_at?: string | null
          course_version_id?: string
          due_at?: string | null
          id?: string
          location_id?: string | null
          organization_id?: string
          score?: number | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_assignments_course_version_id_fkey"
            columns: ["course_version_id"]
            isOneToOne: false
            referencedRelation: "training_course_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_assignments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      training_course_versions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          content: Json
          course_key: string
          created_at: string
          created_by: string
          id: string
          organization_id: string
          pass_score: number
          status: string
          title: string
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          content: Json
          course_key: string
          created_at?: string
          created_by?: string
          id?: string
          organization_id?: string
          pass_score?: number
          status?: string
          title: string
          version: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          content?: Json
          course_key?: string
          created_at?: string
          created_by?: string
          id?: string
          organization_id?: string
          pass_score?: number
          status?: string
          title?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "training_course_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      training_courses: {
        Row: {
          created_at: string
          id: string
          minutes: number
          modules: number
          organization_id: string | null
          required: boolean
          title_de: string
          title_en: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          minutes?: number
          modules?: number
          organization_id?: string | null
          required?: boolean
          title_de: string
          title_en: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          minutes?: number
          modules?: number
          organization_id?: string | null
          required?: boolean
          title_de?: string
          title_en?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_courses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      training_records: {
        Row: {
          certificate_reference: string | null
          certificate_valid_to: string | null
          completed_at: string | null
          course_id: string | null
          course_name: string | null
          created_at: string
          id: string
          idempotency_key: string | null
          location_id: string | null
          organization_id: string | null
          progress: number
          provider: string | null
          score: number | null
          updated_at: string
          user_id: string
          verification_note: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          certificate_reference?: string | null
          certificate_valid_to?: string | null
          completed_at?: string | null
          course_id?: string | null
          course_name?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          organization_id?: string | null
          progress?: number
          provider?: string | null
          score?: number | null
          updated_at?: string
          user_id: string
          verification_note?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          certificate_reference?: string | null
          certificate_valid_to?: string | null
          completed_at?: string | null
          course_id?: string | null
          course_name?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          organization_id?: string | null
          progress?: number
          provider?: string | null
          score?: number | null
          updated_at?: string
          user_id?: string
          verification_note?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_training_records_location_organization"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "training_records_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_records_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      unified_inbox_items: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          due_at: string | null
          id: string
          item_type: string
          location_id: string | null
          organization_id: string
          owner_id: string | null
          resolved_at: string | null
          severity: string
          source_id: string
          source_table: string
          status: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          item_type: string
          location_id?: string | null
          organization_id: string
          owner_id?: string | null
          resolved_at?: string | null
          severity?: string
          source_id: string
          source_table: string
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          item_type?: string
          location_id?: string | null
          organization_id?: string
          owner_id?: string | null
          resolved_at?: string | null
          severity?: string
          source_id?: string
          source_table?: string
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unified_inbox_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_inbox_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_counters: {
        Row: {
          metric: string
          organization_id: string
          period_end: string
          period_start: string
          quantity: number
          updated_at: string
        }
        Insert: {
          metric: string
          organization_id: string
          period_end: string
          period_start: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          metric?: string
          organization_id?: string
          period_end?: string
          period_start?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_experience_preferences: {
        Row: {
          biometric_lock: boolean
          compact_mode: boolean
          default_station: string | null
          glove_mode: boolean
          high_contrast: boolean
          locale: string
          organization_id: string
          reduced_motion: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          biometric_lock?: boolean
          compact_mode?: boolean
          default_station?: string | null
          glove_mode?: boolean
          high_contrast?: boolean
          locale?: string
          organization_id: string
          reduced_motion?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          biometric_lock?: boolean
          compact_mode?: boolean
          default_station?: string | null
          glove_mode?: boolean
          high_contrast?: boolean
          locale?: string
          organization_id?: string
          reduced_motion?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_experience_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      waste_entries: {
        Row: {
          cost_eur: number | null
          created_at: string
          id: string
          idempotency_key: string | null
          item: string
          location_id: string | null
          logged_at: string
          note: string | null
          organization_id: string | null
          qty: number
          reason: string
          unit: string
          user_id: string
        }
        Insert: {
          cost_eur?: number | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          item: string
          location_id?: string | null
          logged_at?: string
          note?: string | null
          organization_id?: string | null
          qty: number
          reason: string
          unit?: string
          user_id: string
        }
        Update: {
          cost_eur?: number | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          item?: string
          location_id?: string | null
          logged_at?: string
          note?: string | null
          organization_id?: string | null
          qty?: number
          reason?: string
          unit?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_waste_entries_location_organization"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "waste_entries_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waste_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          attempts: number
          created_at: string
          delivered_at: string | null
          endpoint_id: string
          event_id: string
          event_type: string
          id: string
          last_error: string | null
          locked_at: string | null
          next_attempt_at: string
          organization_id: string
          payload: Json
          response_excerpt: string | null
          response_status: number | null
          status: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          delivered_at?: string | null
          endpoint_id: string
          event_id: string
          event_type: string
          id?: string
          last_error?: string | null
          locked_at?: string | null
          next_attempt_at?: string
          organization_id: string
          payload: Json
          response_excerpt?: string | null
          response_status?: number | null
          status?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          delivered_at?: string | null
          endpoint_id?: string
          event_id?: string
          event_type?: string
          id?: string
          last_error?: string | null
          locked_at?: string | null
          next_attempt_at?: string
          organization_id?: string
          payload?: Json
          response_excerpt?: string | null
          response_status?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_deliveries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          created_at: string
          created_by: string
          disabled_at: string | null
          enabled: boolean
          encrypted_signing_secret: string
          event_types: string[]
          failure_count: number
          id: string
          name: string
          organization_id: string
          signing_secret_hash: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          disabled_at?: string | null
          enabled?: boolean
          encrypted_signing_secret: string
          event_types?: string[]
          failure_count?: number
          id?: string
          name: string
          organization_id?: string
          signing_secret_hash: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string
          disabled_at?: string | null
          enabled?: boolean
          encrypted_signing_secret?: string
          event_types?: string[]
          failure_count?: number
          id?: string
          name?: string
          organization_id?: string
          signing_secret_hash?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_endpoints_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_replay_nonces: {
        Row: {
          expires_at: string
          id: string
          integration: string
          nonce_hash: string
          received_at: string
        }
        Insert: {
          expires_at: string
          id?: string
          integration: string
          nonce_hash: string
          received_at?: string
        }
        Update: {
          expires_at?: string
          id?: string
          integration?: string
          nonce_hash?: string
          received_at?: string
        }
        Relationships: []
      }
      workflow_runs: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          due_at: string | null
          id: string
          idempotency_key: string
          location_id: string | null
          organization_id: string
          started_at: string | null
          status: string
          template_id: string
          updated_at: string
          version_id: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          due_at?: string | null
          id?: string
          idempotency_key: string
          location_id?: string | null
          organization_id?: string
          started_at?: string | null
          status?: string
          template_id: string
          updated_at?: string
          version_id: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          due_at?: string | null
          id?: string
          idempotency_key?: string
          location_id?: string | null
          organization_id?: string
          started_at?: string | null
          status?: string
          template_id?: string
          updated_at?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_runs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_runs_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "workflow_template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_step_results: {
        Row: {
          completed_at: string
          completed_by: string
          evidence: Json
          id: string
          organization_id: string
          result: Json
          run_id: string
          status: string
          step_id: string
        }
        Insert: {
          completed_at?: string
          completed_by?: string
          evidence?: Json
          id?: string
          organization_id?: string
          result?: Json
          run_id: string
          status?: string
          step_id: string
        }
        Update: {
          completed_at?: string
          completed_by?: string
          evidence?: Json
          id?: string
          organization_id?: string
          result?: Json
          run_id?: string
          status?: string
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_step_results_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_step_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_step_results_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_steps: {
        Row: {
          condition: Json
          created_at: string
          evidence_required: boolean
          id: string
          input_type: string
          instructions: string | null
          organization_id: string
          position: number
          required: boolean
          title: string
          validation: Json
          version_id: string
        }
        Insert: {
          condition?: Json
          created_at?: string
          evidence_required?: boolean
          id?: string
          input_type?: string
          instructions?: string | null
          organization_id?: string
          position: number
          required?: boolean
          title: string
          validation?: Json
          version_id: string
        }
        Update: {
          condition?: Json
          created_at?: string
          evidence_required?: boolean
          id?: string
          input_type?: string
          instructions?: string | null
          organization_id?: string
          position?: number
          required?: boolean
          title?: string
          validation?: Json
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_steps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_steps_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "workflow_template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_template_versions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          change_summary: string | null
          created_at: string
          created_by: string
          id: string
          organization_id: string
          published_at: string | null
          status: string
          template_id: string
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          change_summary?: string | null
          created_at?: string
          created_by?: string
          id?: string
          organization_id?: string
          published_at?: string | null
          status?: string
          template_id: string
          version: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          change_summary?: string | null
          created_at?: string
          created_by?: string
          id?: string
          organization_id?: string
          published_at?: string | null
          status?: string
          template_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "workflow_template_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          active_version_id: string | null
          category: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          location_id: string | null
          name: string
          organization_id: string
          recurrence: Json
          updated_at: string
        }
        Insert: {
          active_version_id?: string | null
          category?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          location_id?: string | null
          name: string
          organization_id?: string
          recurrence?: Json
          updated_at?: string
        }
        Update: {
          active_version_id?: string | null
          category?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          location_id?: string | null
          name?: string
          organization_id?: string
          recurrence?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_templates_active_version_fk"
            columns: ["organization_id", "active_version_id"]
            isOneToOne: false
            referencedRelation: "workflow_template_versions"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "workflow_templates_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_inspector_invitation: { Args: { p_token: string }; Returns: Json }
      accept_organization_invitation: {
        Args: { p_token: string }
        Returns: Json
      }
      acknowledge_my_induction: {
        Args: { p_assignment_id: string }
        Returns: string
      }
      bootstrap_my_organization: {
        Args: {
          p_business_state?: string
          p_location_name?: string
          p_modules?: string[]
          p_name: string
        }
        Returns: Json
      }
      can_contribute_to_organization: {
        Args: { p_organization_id: string }
        Returns: boolean
      }
      can_manage_organization: {
        Args: { p_organization_id: string }
        Returns: boolean
      }
      can_operate_record: {
        Args: {
          p_actor_id: string
          p_location_id?: string
          p_organization_id: string
        }
        Returns: boolean
      }
      can_read_organization: {
        Args: { p_organization_id: string }
        Returns: boolean
      }
      claim_file_scan_jobs: {
        Args: { p_limit?: number }
        Returns: {
          attempts: number
          completed_at: string | null
          created_at: string
          document_id: string
          id: string
          last_error: string | null
          locked_at: string | null
          next_attempt_at: string
          organization_id: string
          provider_reference: string | null
          result: Json
          status: string
          storage_path: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "file_scan_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_webhook_deliveries: {
        Args: { p_limit?: number }
        Returns: {
          attempts: number
          created_at: string
          delivered_at: string | null
          endpoint_id: string
          event_id: string
          event_type: string
          id: string
          last_error: string | null
          locked_at: string | null
          next_attempt_at: string
          organization_id: string
          payload: Json
          response_excerpt: string | null
          response_status: number | null
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "webhook_deliveries"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      clear_health_exclusion: {
        Args: { p_clearance_note?: string; p_record_id: string }
        Returns: string
      }
      complete_workflow_run: {
        Args: { p_run_id: string }
        Returns: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          due_at: string | null
          id: string
          idempotency_key: string
          location_id: string | null
          organization_id: string
          started_at: string | null
          status: string
          template_id: string
          updated_at: string
          version_id: string
        }
        SetofOptions: {
          from: "*"
          to: "workflow_runs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      consume_rate_limit: {
        Args: {
          p_bucket_key: string
          p_limit: number
          p_window_seconds: number
        }
        Returns: boolean
      }
      current_location_id: { Args: never; Returns: string }
      current_organization_id: { Args: never; Returns: string }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      decide_high_risk_action: {
        Args: { p_approve: boolean; p_reason: string; p_request_id: string }
        Returns: {
          action: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_reason: string | null
          executed_at: string | null
          expires_at: string
          id: string
          organization_id: string
          payload: Json
          reason: string
          requested_by: string
          resource_id: string | null
          resource_type: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "high_risk_action_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      disable_my_push_token: { Args: { p_token: string }; Returns: undefined }
      dispatch_operations_control: { Args: never; Returns: Json }
      get_document_scan_status: {
        Args: { p_document_id: string }
        Returns: string
      }
      get_my_context: { Args: never; Returns: Json }
      get_my_entitlements: { Args: never; Returns: Json }
      has_org_role: {
        Args: {
          p_organization_id: string
          p_roles: Database["public"]["Enums"]["app_role"][]
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_valid_inspector_grant: {
        Args: {
          p_location_id?: string
          p_organization_id: string
          p_scope?: string
        }
        Returns: boolean
      }
      increment_usage: {
        Args: {
          p_metric: string
          p_organization_id: string
          p_quantity?: number
        }
        Returns: number
      }
      is_inspector: { Args: { _user_id: string }; Returns: boolean }
      is_manager_or_owner: { Args: { _user_id: string }; Returns: boolean }
      is_valid_profile_context: {
        Args: { p_location_id: string; p_organization_id: string }
        Returns: boolean
      }
      record_evidence_export: {
        Args: { p_from: string; p_to: string }
        Returns: undefined
      }
      record_haccp_plan: {
        Args: { p_approve?: boolean; p_plan: Json; p_statement?: string }
        Returns: Json
      }
      record_security_event: {
        Args: {
          p_event_type: string
          p_ip_hash?: string
          p_metadata?: Json
          p_severity?: string
          p_source?: string
          p_user_agent_hash?: string
        }
        Returns: string
      }
      register_device_session: {
        Args: {
          p_assurance_level?: string
          p_device_label: string
          p_ip_hash?: string
          p_platform: string
          p_session_fingerprint: string
          p_user_agent_hash?: string
        }
        Returns: string
      }
      register_my_push_token: {
        Args: { p_platform: string; p_token: string }
        Returns: undefined
      }
      set_my_notification_preferences: {
        Args: {
          p_email_enabled?: boolean
          p_push_enabled?: boolean
          p_weekly_digest?: boolean
        }
        Returns: undefined
      }
      set_my_notification_schedule: {
        Args: {
          p_expiry_alerts_enabled?: boolean
          p_issue_alerts_enabled?: boolean
          p_start_of_day_enabled?: boolean
          p_start_of_day_local_time?: string
        }
        Returns: undefined
      }
      transition_corrective_action: {
        Args: {
          p_action_id: string
          p_evidence?: Json
          p_note?: string
          p_status: string
        }
        Returns: {
          category: string
          closed_at: string | null
          completed_at: string | null
          corrective_action: string | null
          created_at: string
          created_by: string
          description: string
          due_at: string | null
          escalated_at: string | null
          evidence: Json
          id: string
          immediate_action: string | null
          location_id: string | null
          organization_id: string
          owner_id: string | null
          preventive_action: string | null
          root_cause: string | null
          severity: string
          source_id: string
          source_table: string
          status: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "corrective_actions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      try_uuid: { Args: { p_value: string }; Returns: string }
    }
    Enums: {
      app_role: "owner" | "manager" | "chef" | "staff" | "inspector"
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
      app_role: ["owner", "manager", "chef", "staff", "inspector"],
    },
  },
} as const
