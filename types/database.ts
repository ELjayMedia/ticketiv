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
      admin_action_catalog: {
        Row: {
          backend_function: string | null
          created_at: string
          description: string
          is_enabled: boolean
          key: string
          label: string
          required_role: string
          target_table: string
          workspace_key: string
        }
        Insert: {
          backend_function?: string | null
          created_at?: string
          description: string
          is_enabled?: boolean
          key: string
          label: string
          required_role?: string
          target_table: string
          workspace_key: string
        }
        Update: {
          backend_function?: string | null
          created_at?: string
          description?: string
          is_enabled?: boolean
          key?: string
          label?: string
          required_role?: string
          target_table?: string
          workspace_key?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          active: boolean
          created_at: string
          notes: string | null
          role_tier: Database["public"]["Enums"]["admin_role_tier"]
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          notes?: string | null
          role_tier?: Database["public"]["Enums"]["admin_role_tier"]
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          notes?: string | null
          role_tier?: Database["public"]["Enums"]["admin_role_tier"]
          user_id?: string
        }
        Relationships: []
      }
      app_audit_log: {
        Row: {
          change_query: string | null
          changed_by: string | null
          id: string
          occurred_at: string
          operation: string
          row_data: Json | null
          schema_name: string
          table_name: string
        }
        Insert: {
          change_query?: string | null
          changed_by?: string | null
          id?: string
          occurred_at?: string
          operation: string
          row_data?: Json | null
          schema_name: string
          table_name: string
        }
        Update: {
          change_query?: string | null
          changed_by?: string | null
          id?: string
          occurred_at?: string
          operation?: string
          row_data?: Json | null
          schema_name?: string
          table_name?: string
        }
        Relationships: []
      }
      artists: {
        Row: {
          bio: string | null
          created_at: string | null
          id: string
          image_url: string | null
          name: string
          name_key: string | null
          org_id: string | null
          primary_user_id: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          name: string
          name_key?: string | null
          org_id?: string | null
          primary_user_id?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          name?: string
          name_key?: string | null
          org_id?: string | null
          primary_user_id?: string | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id: string | null
          changes: Json | null
          created_at: string | null
          id: string
          ip: string | null
          org_id: string | null
          record_id: string | null
          table_name: string
          user_agent: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          changes?: Json | null
          created_at?: string | null
          id?: string
          ip?: string | null
          org_id?: string | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          changes?: Json | null
          created_at?: string | null
          id?: string
          ip?: string | null
          org_id?: string | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_public"
            referencedColumns: ["id"]
          },
        ]
      }
      credential_batches: {
        Row: {
          accepted_at: string | null
          branding_version: string | null
          chip_family: string
          chip_product: string | null
          created_at: string
          created_by: string | null
          event_id: string | null
          frequency: string
          id: string
          key_version: string | null
          memory_bytes: number | null
          metadata: Json
          notes: string | null
          org_id: string | null
          production_date: string | null
          protocol: string
          purpose: string
          quantity_ordered: number
          quantity_received: number
          quarantined_at: string | null
          received_at: string | null
          serial_prefix: string | null
          status: string
          supplier_name: string
          supplier_reference: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          accepted_at?: string | null
          branding_version?: string | null
          chip_family: string
          chip_product?: string | null
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          frequency?: string
          id?: string
          key_version?: string | null
          memory_bytes?: number | null
          metadata?: Json
          notes?: string | null
          org_id?: string | null
          production_date?: string | null
          protocol?: string
          purpose?: string
          quantity_ordered?: number
          quantity_received?: number
          quarantined_at?: string | null
          received_at?: string | null
          serial_prefix?: string | null
          status?: string
          supplier_name: string
          supplier_reference?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          accepted_at?: string | null
          branding_version?: string | null
          chip_family?: string
          chip_product?: string | null
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          frequency?: string
          id?: string
          key_version?: string | null
          memory_bytes?: number | null
          metadata?: Json
          notes?: string | null
          org_id?: string | null
          production_date?: string | null
          protocol?: string
          purpose?: string
          quantity_ordered?: number
          quantity_received?: number
          quarantined_at?: string | null
          received_at?: string | null
          serial_prefix?: string | null
          status?: string
          supplier_name?: string
          supplier_reference?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credential_batches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "admin_event_readiness"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "credential_batches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_catalog"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "credential_batches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "credential_batches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_batches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mv_event_sales"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "credential_batches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_artist_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_batches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_kpis"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "credential_batches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_batches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_sales_public"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "credential_batches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_batches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_inbound_transfers"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "credential_batches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "credential_batches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_batches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_public_event_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_batches_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_batches_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_public"
            referencedColumns: ["id"]
          },
        ]
      }
      credential_entitlements: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          assignment_source: string
          created_at: string
          credential_id: string
          event_id: string
          holder_user_id: string | null
          id: string
          metadata: Json
          order_item_id: string
          removal_reason: string | null
          removed_at: string | null
          removed_by: string | null
          status: string
          updated_at: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          assignment_source?: string
          created_at?: string
          credential_id: string
          event_id: string
          holder_user_id?: string | null
          id?: string
          metadata?: Json
          order_item_id: string
          removal_reason?: string | null
          removed_at?: string | null
          removed_by?: string | null
          status?: string
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          assignment_source?: string
          created_at?: string
          credential_id?: string
          event_id?: string
          holder_user_id?: string | null
          id?: string
          metadata?: Json
          order_item_id?: string
          removal_reason?: string | null
          removed_at?: string | null
          removed_by?: string | null
          status?: string
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credential_entitlements_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "physical_credentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_entitlements_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "admin_event_readiness"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "credential_entitlements_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_catalog"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "credential_entitlements_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "credential_entitlements_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_entitlements_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mv_event_sales"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "credential_entitlements_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_artist_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_entitlements_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_kpis"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "credential_entitlements_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_entitlements_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_sales_public"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "credential_entitlements_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_entitlements_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_inbound_transfers"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "credential_entitlements_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "credential_entitlements_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_entitlements_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_public_event_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_entitlements_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_entitlements_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["order_item_id"]
          },
        ]
      }
      credential_inventory: {
        Row: {
          activated_at: string | null
          batch_id: string
          chip_family: string
          chip_fingerprint: string | null
          chip_identifier_hash: string | null
          created_at: string
          created_by: string | null
          current_credential_id: string | null
          defect_reason: string | null
          event_id: string | null
          external_serial: string | null
          id: string
          inventory_status: string
          issued_at: string | null
          key_version: string | null
          metadata: Json
          org_id: string | null
          outlet_id: string | null
          public_serial: string
          qr_reference: string | null
          retired_at: string | null
          secure_element_ref: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activated_at?: string | null
          batch_id: string
          chip_family: string
          chip_fingerprint?: string | null
          chip_identifier_hash?: string | null
          created_at?: string
          created_by?: string | null
          current_credential_id?: string | null
          defect_reason?: string | null
          event_id?: string | null
          external_serial?: string | null
          id?: string
          inventory_status?: string
          issued_at?: string | null
          key_version?: string | null
          metadata?: Json
          org_id?: string | null
          outlet_id?: string | null
          public_serial: string
          qr_reference?: string | null
          retired_at?: string | null
          secure_element_ref?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activated_at?: string | null
          batch_id?: string
          chip_family?: string
          chip_fingerprint?: string | null
          chip_identifier_hash?: string | null
          created_at?: string
          created_by?: string | null
          current_credential_id?: string | null
          defect_reason?: string | null
          event_id?: string | null
          external_serial?: string | null
          id?: string
          inventory_status?: string
          issued_at?: string | null
          key_version?: string | null
          metadata?: Json
          org_id?: string | null
          outlet_id?: string | null
          public_serial?: string
          qr_reference?: string | null
          retired_at?: string | null
          secure_element_ref?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credential_inventory_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "credential_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_inventory_current_credential_id_fkey"
            columns: ["current_credential_id"]
            isOneToOne: false
            referencedRelation: "physical_credentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_inventory_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "admin_event_readiness"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "credential_inventory_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_catalog"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "credential_inventory_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "credential_inventory_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_inventory_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mv_event_sales"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "credential_inventory_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_artist_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_inventory_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_kpis"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "credential_inventory_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_inventory_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_sales_public"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "credential_inventory_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_inventory_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_inbound_transfers"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "credential_inventory_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "credential_inventory_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_inventory_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_public_event_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_inventory_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_inventory_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_public"
            referencedColumns: ["id"]
          },
        ]
      }
      credential_taps: {
        Row: {
          client_attempt_id: string | null
          created_at: string
          credential_id: string | null
          device_id: string | null
          device_session_id: string | null
          event_id: string | null
          id: string
          inventory_id: string | null
          latency_ms: number | null
          metadata: Json
          occurred_at: string
          offline: boolean
          operator_user_id: string | null
          order_item_id: string | null
          outcome: string
          outlet_id: string | null
          presented_credential_hash: string | null
          reason_code: string | null
          synced_at: string | null
          tap_type: string
        }
        Insert: {
          client_attempt_id?: string | null
          created_at?: string
          credential_id?: string | null
          device_id?: string | null
          device_session_id?: string | null
          event_id?: string | null
          id?: string
          inventory_id?: string | null
          latency_ms?: number | null
          metadata?: Json
          occurred_at?: string
          offline?: boolean
          operator_user_id?: string | null
          order_item_id?: string | null
          outcome: string
          outlet_id?: string | null
          presented_credential_hash?: string | null
          reason_code?: string | null
          synced_at?: string | null
          tap_type: string
        }
        Update: {
          client_attempt_id?: string | null
          created_at?: string
          credential_id?: string | null
          device_id?: string | null
          device_session_id?: string | null
          event_id?: string | null
          id?: string
          inventory_id?: string | null
          latency_ms?: number | null
          metadata?: Json
          occurred_at?: string
          offline?: boolean
          operator_user_id?: string | null
          order_item_id?: string | null
          outcome?: string
          outlet_id?: string | null
          presented_credential_hash?: string | null
          reason_code?: string | null
          synced_at?: string | null
          tap_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "credential_taps_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "physical_credentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_taps_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_taps_device_session_id_fkey"
            columns: ["device_session_id"]
            isOneToOne: false
            referencedRelation: "device_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_taps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "admin_event_readiness"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "credential_taps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_catalog"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "credential_taps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "credential_taps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_taps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mv_event_sales"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "credential_taps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_artist_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_taps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_kpis"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "credential_taps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_taps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_sales_public"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "credential_taps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_taps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_inbound_transfers"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "credential_taps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "credential_taps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_taps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_public_event_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_taps_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "credential_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_taps_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_taps_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["order_item_id"]
          },
        ]
      }
      device_sessions: {
        Row: {
          device_id: string
          ended_at: string | null
          id: string
          started_at: string | null
          user_id: string | null
        }
        Insert: {
          device_id: string
          ended_at?: string | null
          id?: string
          started_at?: string | null
          user_id?: string | null
        }
        Update: {
          device_id?: string
          ended_at?: string | null
          id?: string
          started_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_sessions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      device_setup_codes: {
        Row: {
          claimed_at: string | null
          claimed_device_id: string | null
          code_hash: string
          created_at: string
          created_by: string | null
          device_role: Database["public"]["Enums"]["device_role"]
          event_id: string | null
          expires_at: string
          id: string
          label: string
          max_scans_per_minute: number | null
          org_id: string
        }
        Insert: {
          claimed_at?: string | null
          claimed_device_id?: string | null
          code_hash: string
          created_at?: string
          created_by?: string | null
          device_role?: Database["public"]["Enums"]["device_role"]
          event_id?: string | null
          expires_at?: string
          id?: string
          label: string
          max_scans_per_minute?: number | null
          org_id: string
        }
        Update: {
          claimed_at?: string | null
          claimed_device_id?: string | null
          code_hash?: string
          created_at?: string
          created_by?: string | null
          device_role?: Database["public"]["Enums"]["device_role"]
          event_id?: string | null
          expires_at?: string
          id?: string
          label?: string
          max_scans_per_minute?: number | null
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_setup_codes_claimed_device_id_fkey"
            columns: ["claimed_device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_setup_codes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "admin_event_readiness"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "device_setup_codes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_catalog"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "device_setup_codes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "device_setup_codes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_setup_codes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mv_event_sales"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "device_setup_codes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_artist_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_setup_codes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_kpis"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "device_setup_codes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_setup_codes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_sales_public"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "device_setup_codes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_setup_codes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_inbound_transfers"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "device_setup_codes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "device_setup_codes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_setup_codes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_public_event_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_setup_codes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_setup_codes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_public"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          created_at: string | null
          device_role: Database["public"]["Enums"]["device_role"]
          event_id: string | null
          id: string
          label: string | null
          last_seen_at: string | null
          max_scans_per_minute: number | null
          org_id: string
          registered_by: string | null
        }
        Insert: {
          created_at?: string | null
          device_role?: Database["public"]["Enums"]["device_role"]
          event_id?: string | null
          id?: string
          label?: string | null
          last_seen_at?: string | null
          max_scans_per_minute?: number | null
          org_id: string
          registered_by?: string | null
        }
        Update: {
          created_at?: string | null
          device_role?: Database["public"]["Enums"]["device_role"]
          event_id?: string | null
          id?: string
          label?: string | null
          last_seen_at?: string | null
          max_scans_per_minute?: number | null
          org_id?: string
          registered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devices_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "admin_event_readiness"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "devices_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_catalog"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "devices_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "devices_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mv_event_sales"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "devices_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_artist_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_kpis"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "devices_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_sales_public"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "devices_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_inbound_transfers"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "devices_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "devices_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_public_event_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_public"
            referencedColumns: ["id"]
          },
        ]
      }
      event_artists: {
        Row: {
          artist_id: string
          event_id: string
          role: string | null
        }
        Insert: {
          artist_id: string
          event_id: string
          role?: string | null
        }
        Update: {
          artist_id?: string
          event_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_artists_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_artists_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "v_artist_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_artists_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "v_event_lineup_public"
            referencedColumns: ["artist_id"]
          },
          {
            foreignKeyName: "event_artists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "admin_event_readiness"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_artists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_catalog"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_artists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_artists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_artists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mv_event_sales"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_artists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_artist_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_artists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_kpis"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_artists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_artists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_sales_public"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_artists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_artists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_inbound_transfers"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_artists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_artists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_artists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_public_event_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      event_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      event_dates: {
        Row: {
          created_at: string | null
          ends_at: string
          event_id: string
          id: string
          starts_at: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          ends_at: string
          event_id: string
          id?: string
          starts_at: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          ends_at?: string
          event_id?: string
          id?: string
          starts_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_dates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "admin_event_readiness"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_dates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_catalog"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_dates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_dates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_dates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mv_event_sales"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_dates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_artist_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_dates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_kpis"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_dates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_dates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_sales_public"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_dates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_dates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_inbound_transfers"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_dates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_dates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_dates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_public_event_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      event_favourites: {
        Row: {
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_favourites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "admin_event_readiness"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_favourites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_catalog"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_favourites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_favourites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_favourites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mv_event_sales"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_favourites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_artist_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_favourites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_kpis"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_favourites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_favourites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_sales_public"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_favourites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_favourites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_inbound_transfers"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_favourites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_favourites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_favourites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_public_event_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      event_live_stats: {
        Row: {
          checked_in_count: number
          event_id: string
          failed_payments: number
          gross_sales_cents: number
          last_order_at: string | null
          last_scan_at: string | null
          successful_payments: number
          tickets_available: number
          tickets_sold: number
          updated_at: string
        }
        Insert: {
          checked_in_count?: number
          event_id: string
          failed_payments?: number
          gross_sales_cents?: number
          last_order_at?: string | null
          last_scan_at?: string | null
          successful_payments?: number
          tickets_available?: number
          tickets_sold?: number
          updated_at?: string
        }
        Update: {
          checked_in_count?: number
          event_id?: string
          failed_payments?: number
          gross_sales_cents?: number
          last_order_at?: string | null
          last_scan_at?: string | null
          successful_payments?: number
          tickets_available?: number
          tickets_sold?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_live_stats_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "admin_event_readiness"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_live_stats_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "event_catalog"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_live_stats_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "event_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_live_stats_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_live_stats_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "mv_event_sales"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_live_stats_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "v_artist_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_live_stats_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "v_event_kpis"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_live_stats_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "v_event_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_live_stats_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "v_event_sales_public"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_live_stats_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "v_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_live_stats_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "v_inbound_transfers"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_live_stats_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "v_my_tickets"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_live_stats_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "v_organizer_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_live_stats_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "v_public_event_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      event_metrics_daily: {
        Row: {
          created_at: string
          day: string
          event_id: string
          gross_revenue_cents: number
          org_id: string
          refunds_cents: number
          tickets_sold: number
          unique_buyers: number
        }
        Insert: {
          created_at?: string
          day: string
          event_id: string
          gross_revenue_cents?: number
          org_id: string
          refunds_cents?: number
          tickets_sold?: number
          unique_buyers?: number
        }
        Update: {
          created_at?: string
          day?: string
          event_id?: string
          gross_revenue_cents?: number
          org_id?: string
          refunds_cents?: number
          tickets_sold?: number
          unique_buyers?: number
        }
        Relationships: []
      }
      event_series: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          ends_on: string | null
          id: string
          org_id: string
          recurrence_pattern: Json | null
          series_type: Database["public"]["Enums"]["series_type"]
          slug: string
          starts_on: string | null
          title: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          ends_on?: string | null
          id?: string
          org_id: string
          recurrence_pattern?: Json | null
          series_type: Database["public"]["Enums"]["series_type"]
          slug: string
          starts_on?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          ends_on?: string | null
          id?: string
          org_id?: string
          recurrence_pattern?: Json | null
          series_type?: Database["public"]["Enums"]["series_type"]
          slug?: string
          starts_on?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_series_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_series_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_public"
            referencedColumns: ["id"]
          },
        ]
      }
      event_staff: {
        Row: {
          active: boolean | null
          created_at: string | null
          event_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          event_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          event_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_staff_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "admin_event_readiness"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_staff_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_catalog"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_staff_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_staff_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_staff_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mv_event_sales"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_staff_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_artist_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_staff_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_kpis"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_staff_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_staff_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_sales_public"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_staff_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_staff_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_inbound_transfers"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_staff_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_staff_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_staff_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_public_event_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          attendee_fields: Json
          category: string | null
          city: string | null
          confirmation_message: string | null
          country_code: string | null
          cover_image_url: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          ends_at: string | null
          event_format: Database["public"]["Enums"]["event_format"]
          featured_priority: number | null
          id: string
          org_id: string
          payment_providers: string[]
          publish_at: string | null
          published_at: string | null
          refund_policy: Json | null
          resale_cap_bps: number | null
          search_text: string | null
          search_tsv: unknown
          series_id: string | null
          slug: string
          starts_at: string | null
          status: Database["public"]["Enums"]["event_status"]
          title: string
          tz: string | null
          unpublish_at: string | null
          updated_at: string | null
          venue_id: string | null
          visibility: string
        }
        Insert: {
          attendee_fields?: Json
          category?: string | null
          city?: string | null
          confirmation_message?: string | null
          country_code?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          event_format?: Database["public"]["Enums"]["event_format"]
          featured_priority?: number | null
          id?: string
          org_id: string
          payment_providers?: string[]
          publish_at?: string | null
          published_at?: string | null
          refund_policy?: Json | null
          resale_cap_bps?: number | null
          search_text?: string | null
          search_tsv?: unknown
          series_id?: string | null
          slug: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          title: string
          tz?: string | null
          unpublish_at?: string | null
          updated_at?: string | null
          venue_id?: string | null
          visibility?: string
        }
        Update: {
          attendee_fields?: Json
          category?: string | null
          city?: string | null
          confirmation_message?: string | null
          country_code?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          event_format?: Database["public"]["Enums"]["event_format"]
          featured_priority?: number | null
          id?: string
          org_id?: string
          payment_providers?: string[]
          publish_at?: string | null
          published_at?: string | null
          refund_policy?: Json | null
          resale_cap_bps?: number | null
          search_text?: string | null
          search_tsv?: unknown
          series_id?: string | null
          slug?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          title?: string
          tz?: string | null
          unpublish_at?: string | null
          updated_at?: string | null
          venue_id?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "event_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          config: Json | null
          created_at: string | null
          description: string | null
          enabled: boolean
          id: string
          key: string
          last_changed_at: string | null
          last_changed_by: string | null
          org_id: string | null
          owner: string | null
          rollout_percent: number | null
          tags: string[]
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          description?: string | null
          enabled?: boolean
          id?: string
          key: string
          last_changed_at?: string | null
          last_changed_by?: string | null
          org_id?: string | null
          owner?: string | null
          rollout_percent?: number | null
          tags?: string[]
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          description?: string | null
          enabled?: boolean
          id?: string
          key?: string
          last_changed_at?: string | null
          last_changed_by?: string | null
          org_id?: string | null
          owner?: string | null
          rollout_percent?: number | null
          tags?: string[]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flags_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_public"
            referencedColumns: ["id"]
          },
        ]
      }
      guestlist_entries: {
        Row: {
          allocation: number
          created_at: string | null
          created_by: string | null
          email: string | null
          event_id: string
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          ticket_type_id: string | null
        }
        Insert: {
          allocation?: number
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          event_id: string
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          ticket_type_id?: string | null
        }
        Update: {
          allocation?: number
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          event_id?: string
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          ticket_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guestlist_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "admin_event_readiness"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "guestlist_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_catalog"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "guestlist_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "guestlist_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guestlist_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mv_event_sales"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "guestlist_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_artist_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guestlist_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_kpis"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "guestlist_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guestlist_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_sales_public"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "guestlist_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guestlist_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_inbound_transfers"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "guestlist_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "guestlist_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guestlist_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_public_event_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guestlist_entries_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guestlist_entries_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["ticket_type_id"]
          },
        ]
      }
      guestlist_fulfillments: {
        Row: {
          created_at: string | null
          guestlist_entry_id: string
          id: string
          order_id: string
        }
        Insert: {
          created_at?: string | null
          guestlist_entry_id: string
          id?: string
          order_id: string
        }
        Update: {
          created_at?: string | null
          guestlist_entry_id?: string
          id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guestlist_fulfillments_guestlist_entry_id_fkey"
            columns: ["guestlist_entry_id"]
            isOneToOne: false
            referencedRelation: "guestlist_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guestlist_fulfillments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "mv_revenue_breakdown"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "guestlist_fulfillments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_financials"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "guestlist_fulfillments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guestlist_fulfillments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["order_id"]
          },
        ]
      }
      jobs: {
        Row: {
          attempts: number | null
          created_at: string | null
          id: string
          kind: string
          last_error: string | null
          locked_at: string | null
          max_attempts: number | null
          payload: Json
          run_after: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          id?: string
          kind: string
          last_error?: string | null
          locked_at?: string | null
          max_attempts?: number | null
          payload: Json
          run_after?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          id?: string
          kind?: string
          last_error?: string | null
          locked_at?: string | null
          max_attempts?: number | null
          payload?: Json
          run_after?: string | null
        }
        Relationships: []
      }
      ledger_entries: {
        Row: {
          amount_cents: number
          currency: string
          event_id: string | null
          id: string
          meta: Json | null
          occurred_at: string
          order_id: string | null
          org_id: string
          payment_id: string | null
          payout_id: string | null
          refund_id: string | null
          type: string
        }
        Insert: {
          amount_cents: number
          currency: string
          event_id?: string | null
          id?: string
          meta?: Json | null
          occurred_at?: string
          order_id?: string | null
          org_id: string
          payment_id?: string | null
          payout_id?: string | null
          refund_id?: string | null
          type: string
        }
        Update: {
          amount_cents?: number
          currency?: string
          event_id?: string | null
          id?: string
          meta?: Json | null
          occurred_at?: string
          order_id?: string | null
          org_id?: string
          payment_id?: string | null
          payout_id?: string | null
          refund_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "admin_event_readiness"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ledger_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_catalog"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ledger_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ledger_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mv_event_sales"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ledger_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_artist_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_kpis"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ledger_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_sales_public"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ledger_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_inbound_transfers"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ledger_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ledger_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_public_event_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "mv_revenue_breakdown"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "ledger_entries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_financials"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "ledger_entries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "ledger_entries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "payouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_refund_id_fkey"
            columns: ["refund_id"]
            isOneToOne: false
            referencedRelation: "refunds"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_by: string
          event_id: string | null
          expires_at: string
          id: string
          invited_email: string | null
          kind: string
          org_id: string
          revoked_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string
          event_id?: string | null
          expires_at?: string
          id?: string
          invited_email?: string | null
          kind: string
          org_id: string
          revoked_at?: string | null
          role: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string
          event_id?: string | null
          expires_at?: string
          id?: string
          invited_email?: string | null
          kind?: string
          org_id?: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_invites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "admin_event_readiness"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "membership_invites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_catalog"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "membership_invites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "membership_invites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_invites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mv_event_sales"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "membership_invites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_artist_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_invites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_kpis"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "membership_invites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_invites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_sales_public"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "membership_invites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_invites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_inbound_transfers"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "membership_invites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "membership_invites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_invites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_public_event_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_public"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_mutes: {
        Row: {
          id: string
          muted_at: string
          notification_type: string
          user_id: string
        }
        Insert: {
          id?: string
          muted_at?: string
          notification_type: string
          user_id: string
        }
        Update: {
          id?: string
          muted_at?: string
          notification_type?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          attempts: number
          channel: string | null
          created_at: string
          dedupe_key: string | null
          delivered_at: string | null
          id: string
          last_error: string | null
          payload: Json | null
          read_at: string | null
          scheduled_at: string | null
          sent_at: string | null
          status: string
          type: string
          user_id: string | null
        }
        Insert: {
          attempts?: number
          channel?: string | null
          created_at?: string
          dedupe_key?: string | null
          delivered_at?: string | null
          id?: string
          last_error?: string | null
          payload?: Json | null
          read_at?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          type: string
          user_id?: string | null
        }
        Update: {
          attempts?: number
          channel?: string | null
          created_at?: string
          dedupe_key?: string | null
          delivered_at?: string | null
          id?: string
          last_error?: string | null
          payload?: Json | null
          read_at?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      order_adjustments: {
        Row: {
          amount_cents: number
          created_at: string | null
          id: string
          label: string | null
          order_id: string
          price_rule_id: string | null
          scope: string
          target_order_item_id: string | null
          type: Database["public"]["Enums"]["price_rule_type"]
        }
        Insert: {
          amount_cents: number
          created_at?: string | null
          id?: string
          label?: string | null
          order_id: string
          price_rule_id?: string | null
          scope: string
          target_order_item_id?: string | null
          type: Database["public"]["Enums"]["price_rule_type"]
        }
        Update: {
          amount_cents?: number
          created_at?: string | null
          id?: string
          label?: string | null
          order_id?: string
          price_rule_id?: string | null
          scope?: string
          target_order_item_id?: string | null
          type?: Database["public"]["Enums"]["price_rule_type"]
        }
        Relationships: [
          {
            foreignKeyName: "order_adjustments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "mv_revenue_breakdown"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_adjustments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_financials"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_adjustments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_adjustments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_adjustments_price_rule_id_fkey"
            columns: ["price_rule_id"]
            isOneToOne: false
            referencedRelation: "price_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_adjustments_target_order_item_id_fkey"
            columns: ["target_order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_adjustments_target_order_item_id_fkey"
            columns: ["target_order_item_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["order_item_id"]
          },
        ]
      }
      order_items: {
        Row: {
          checked_in_at: string | null
          created_at: string | null
          current_owner_id: string | null
          holder_email: string | null
          holder_name: string | null
          holder_phone: string | null
          holder_user_id: string | null
          id: string
          name: string | null
          order_id: string
          refunded_at: string | null
          revoked_at: string | null
          seat_id: string | null
          status: Database["public"]["Enums"]["order_item_status"]
          ticket_code: string
          ticket_type_id: string
          transferred_from_order_item_id: string | null
          updated_at: string | null
        }
        Insert: {
          checked_in_at?: string | null
          created_at?: string | null
          current_owner_id?: string | null
          holder_email?: string | null
          holder_name?: string | null
          holder_phone?: string | null
          holder_user_id?: string | null
          id?: string
          name?: string | null
          order_id: string
          refunded_at?: string | null
          revoked_at?: string | null
          seat_id?: string | null
          status?: Database["public"]["Enums"]["order_item_status"]
          ticket_code: string
          ticket_type_id: string
          transferred_from_order_item_id?: string | null
          updated_at?: string | null
        }
        Update: {
          checked_in_at?: string | null
          created_at?: string | null
          current_owner_id?: string | null
          holder_email?: string | null
          holder_name?: string | null
          holder_phone?: string | null
          holder_user_id?: string | null
          id?: string
          name?: string | null
          order_id?: string
          refunded_at?: string | null
          revoked_at?: string | null
          seat_id?: string | null
          status?: Database["public"]["Enums"]["order_item_status"]
          ticket_code?: string
          ticket_type_id?: string
          transferred_from_order_item_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "mv_revenue_breakdown"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_financials"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_seat_id_fkey"
            columns: ["seat_id"]
            isOneToOne: false
            referencedRelation: "seats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["ticket_type_id"]
          },
          {
            foreignKeyName: "order_items_transferred_from_order_item_id_fkey"
            columns: ["transferred_from_order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_transferred_from_order_item_id_fkey"
            columns: ["transferred_from_order_item_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["order_item_id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_email: string | null
          buyer_id: string | null
          buyer_phone: string | null
          cashier_user_id: string | null
          channel: Database["public"]["Enums"]["sales_channel"]
          created_at: string
          currency: string
          device_id: string | null
          device_session_id: string | null
          email: string | null
          fees_paid_by: Database["public"]["Enums"]["fee_payer"] | null
          hold_expires_at: string | null
          id: string
          item_count: number | null
          order_currency: string | null
          organizer_net_cents: number | null
          order_platform_fee_cents: number | null
          order_price_cents: number | null
          order_processor_fee_cents: number | null
          org_id: string
          phone: string | null
          platform_fee_cents: number | null
          pos_shift_id: string | null
          pricing_plan_id: string | null
          pricing_plan_snapshot: Json | null
          processor_fee_cents: number | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal_cents: number | null
          total_cents: number
          totals_computed_at: string | null
        }
        Insert: {
          buyer_email?: string | null
          buyer_id?: string | null
          buyer_phone?: string | null
          cashier_user_id?: string | null
          channel?: Database["public"]["Enums"]["sales_channel"]
          created_at?: string
          currency?: string
          device_id?: string | null
          device_session_id?: string | null
          email?: string | null
          fees_paid_by?: Database["public"]["Enums"]["fee_payer"] | null
          hold_expires_at?: string | null
          id?: string
          item_count?: number | null
          order_currency?: string | null
          organizer_net_cents?: number | null
          order_platform_fee_cents?: number | null
          order_price_cents?: number | null
          order_processor_fee_cents?: number | null
          org_id: string
          phone?: string | null
          platform_fee_cents?: number | null
          pos_shift_id?: string | null
          pricing_plan_id?: string | null
          pricing_plan_snapshot?: Json | null
          processor_fee_cents?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_cents?: number | null
          total_cents: number
          totals_computed_at?: string | null
        }
        Update: {
          buyer_email?: string | null
          buyer_id?: string | null
          buyer_phone?: string | null
          cashier_user_id?: string | null
          channel?: Database["public"]["Enums"]["sales_channel"]
          created_at?: string
          currency?: string
          device_id?: string | null
          device_session_id?: string | null
          email?: string | null
          fees_paid_by?: Database["public"]["Enums"]["fee_payer"] | null
          hold_expires_at?: string | null
          id?: string
          item_count?: number | null
          order_currency?: string | null
          organizer_net_cents?: number | null
          order_platform_fee_cents?: number | null
          order_price_cents?: number | null
          order_processor_fee_cents?: number | null
          org_id?: string
          phone?: string | null
          platform_fee_cents?: number | null
          pos_shift_id?: string | null
          pricing_plan_id?: string | null
          pricing_plan_snapshot?: Json | null
          processor_fee_cents?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_cents?: number | null
          total_cents?: number
          totals_computed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_device_session_id_fkey"
            columns: ["device_session_id"]
            isOneToOne: false
            referencedRelation: "device_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_pos_shift_id_fkey"
            columns: ["pos_shift_id"]
            isOneToOne: false
            referencedRelation: "pos_shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_pricing_plan_id_fkey"
            columns: ["pricing_plan_id"]
            isOneToOne: false
            referencedRelation: "pricing_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          created_at: string | null
          org_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          org_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          org_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_public"
            referencedColumns: ["id"]
          },
        ]
      }
      org_metrics_daily: {
        Row: {
          active_events: number
          created_at: string
          day: string
          gross_revenue_cents: number
          org_id: string
          refunds_cents: number
          tickets_sold: number
          unique_buyers: number
        }
        Insert: {
          active_events?: number
          created_at?: string
          day: string
          gross_revenue_cents?: number
          org_id: string
          refunds_cents?: number
          tickets_sold?: number
          unique_buyers?: number
        }
        Update: {
          active_events?: number
          created_at?: string
          day?: string
          gross_revenue_cents?: number
          org_id?: string
          refunds_cents?: number
          tickets_sold?: number
          unique_buyers?: number
        }
        Relationships: []
      }
      organizations: {
        Row: {
          bio: string | null
          created_at: string
          default_currency: string
          id: string
          logo: string | null
          name: string
          slug: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          default_currency?: string
          id?: string
          logo?: string | null
          name: string
          slug: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          default_currency?: string
          id?: string
          logo?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      payment_attempts: {
        Row: {
          attempt_no: number
          created_at: string
          ext_ref: string | null
          id: string
          order_id: string
          payload: Json | null
          payment_id: string | null
          provider: string
          status: string
        }
        Insert: {
          attempt_no: number
          created_at?: string
          ext_ref?: string | null
          id?: string
          order_id: string
          payload?: Json | null
          payment_id?: string | null
          provider: string
          status: string
        }
        Update: {
          attempt_no?: number
          created_at?: string
          ext_ref?: string | null
          id?: string
          order_id?: string
          payload?: Json | null
          payment_id?: string | null
          provider?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_attempts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "mv_revenue_breakdown"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "payment_attempts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_financials"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "payment_attempts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_attempts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "payment_attempts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          brand: string | null
          created_at: string
          exp_month: number | null
          exp_year: number | null
          id: string
          is_active: boolean
          is_default: boolean
          last4: string | null
          method_type: string
          provider: string
          token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          exp_month?: number | null
          exp_year?: number | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          last4?: string | null
          method_type?: string
          provider: string
          token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          exp_month?: number | null
          exp_year?: number | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          last4?: string | null
          method_type?: string
          provider?: string
          token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_provider_settings: {
        Row: {
          callback_url: string | null
          created_at: string
          is_enabled: boolean
          mode: string
          provider: string
          public_key: string | null
          secret_key: string | null
          updated_at: string
          updated_by: string | null
          webhook_secret: string | null
        }
        Insert: {
          callback_url?: string | null
          created_at?: string
          is_enabled?: boolean
          mode?: string
          provider: string
          public_key?: string | null
          secret_key?: string | null
          updated_at?: string
          updated_by?: string | null
          webhook_secret?: string | null
        }
        Update: {
          callback_url?: string | null
          created_at?: string
          is_enabled?: boolean
          mode?: string
          provider?: string
          public_key?: string | null
          secret_key?: string | null
          updated_at?: string
          updated_by?: string | null
          webhook_secret?: string | null
        }
        Relationships: []
      }
      payment_routing_rules: {
        Row: {
          conditions: Json
          country_code: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          fallback_provider: string | null
          id: string
          is_active: boolean
          notes: string | null
          priority: number
          provider: string
          updated_at: string
        }
        Insert: {
          conditions?: Json
          country_code?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          fallback_provider?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          priority?: number
          provider: string
          updated_at?: string
        }
        Update: {
          conditions?: Json
          country_code?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          fallback_provider?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          priority?: number
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_outbox: {
        Row: {
          attempts: number
          available_at: string
          created_at: string
          id: string
          last_error: string | null
          locked_at: string | null
          order_id: string
          payload: Json
          payment_id: string | null
          status: string
          topic: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          available_at?: string
          created_at?: string
          id?: string
          last_error?: string | null
          locked_at?: string | null
          order_id: string
          payload?: Json
          payment_id?: string | null
          status?: string
          topic: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          available_at?: string
          created_at?: string
          id?: string
          last_error?: string | null
          locked_at?: string | null
          order_id?: string
          payload?: Json
          payment_id?: string | null
          status?: string
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_outbox_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_outbox_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          channel: Database["public"]["Enums"]["sales_channel"] | null
          created_at: string | null
          currency: string
          ext_payment_id: string | null
          id: string
          order_id: string
          payload: Json | null
          provider: string
          status: Database["public"]["Enums"]["payments_status"] | null
        }
        Insert: {
          amount_cents: number
          channel?: Database["public"]["Enums"]["sales_channel"] | null
          created_at?: string | null
          currency: string
          ext_payment_id?: string | null
          id?: string
          order_id: string
          payload?: Json | null
          provider: string
          status?: Database["public"]["Enums"]["payments_status"] | null
        }
        Update: {
          amount_cents?: number
          channel?: Database["public"]["Enums"]["sales_channel"] | null
          created_at?: string | null
          currency?: string
          ext_payment_id?: string | null
          id?: string
          order_id?: string
          payload?: Json | null
          provider?: string
          status?: Database["public"]["Enums"]["payments_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "mv_revenue_breakdown"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_financials"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["order_id"]
          },
        ]
      }
      payout_accounts: {
        Row: {
          created_at: string | null
          details_encrypted: string
          id: string
          org_id: string
          provider: string
        }
        Insert: {
          created_at?: string | null
          details_encrypted: string
          id?: string
          org_id: string
          provider: string
        }
        Update: {
          created_at?: string | null
          details_encrypted?: string
          id?: string
          org_id?: string
          provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_accounts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_accounts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_public"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount_cents: number
          created_at: string | null
          currency: string
          destination_ref: string | null
          id: string
          org_id: string
          paid_at: string | null
          provider: string
          status: Database["public"]["Enums"]["payout_status"]
        }
        Insert: {
          amount_cents: number
          created_at?: string | null
          currency?: string
          destination_ref?: string | null
          id?: string
          org_id: string
          paid_at?: string | null
          provider: string
          status?: Database["public"]["Enums"]["payout_status"]
        }
        Update: {
          amount_cents?: number
          created_at?: string | null
          currency?: string
          destination_ref?: string | null
          id?: string
          org_id?: string
          paid_at?: string | null
          provider?: string
          status?: Database["public"]["Enums"]["payout_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payouts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_public"
            referencedColumns: ["id"]
          },
        ]
      }
      physical_credentials: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          authentication_mode: string
          chip_family: string
          created_at: string
          credential_public_id: string
          credential_type: string
          id: string
          inventory_id: string
          issued_at: string
          issued_by: string | null
          key_version: string | null
          last_used_at: string | null
          pin_enabled: boolean
          replaced_by_id: string | null
          replacement_of_id: string | null
          revocation_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          status: string
          updated_at: string
          user_id: string | null
          verification_metadata: Json
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          authentication_mode?: string
          chip_family: string
          created_at?: string
          credential_public_id: string
          credential_type?: string
          id?: string
          inventory_id: string
          issued_at?: string
          issued_by?: string | null
          key_version?: string | null
          last_used_at?: string | null
          pin_enabled?: boolean
          replaced_by_id?: string | null
          replacement_of_id?: string | null
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          verification_metadata?: Json
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          authentication_mode?: string
          chip_family?: string
          created_at?: string
          credential_public_id?: string
          credential_type?: string
          id?: string
          inventory_id?: string
          issued_at?: string
          issued_by?: string | null
          key_version?: string | null
          last_used_at?: string | null
          pin_enabled?: boolean
          replaced_by_id?: string | null
          replacement_of_id?: string | null
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          verification_metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "physical_credentials_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "credential_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "physical_credentials_replaced_by_id_fkey"
            columns: ["replaced_by_id"]
            isOneToOne: false
            referencedRelation: "physical_credentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "physical_credentials_replacement_of_id_fkey"
            columns: ["replacement_of_id"]
            isOneToOne: false
            referencedRelation: "physical_credentials"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_shifts: {
        Row: {
          cash_variance_cents: number | null
          cashier_user_id: string
          closed_at: string | null
          closed_by: string | null
          closing_cash_cents: number | null
          closing_notes: string | null
          created_at: string
          device_id: string | null
          device_session_id: string | null
          expected_cash_cents: number | null
          id: string
          opened_at: string
          opened_by: string
          opening_cash_cents: number
          opening_notes: string | null
          org_id: string
          status: string
          updated_at: string
        }
        Insert: {
          cash_variance_cents?: number | null
          cashier_user_id: string
          closed_at?: string | null
          closed_by?: string | null
          closing_cash_cents?: number | null
          closing_notes?: string | null
          created_at?: string
          device_id?: string | null
          device_session_id?: string | null
          expected_cash_cents?: number | null
          id?: string
          opened_at?: string
          opened_by: string
          opening_cash_cents?: number
          opening_notes?: string | null
          org_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          cash_variance_cents?: number | null
          cashier_user_id?: string
          closed_at?: string | null
          closed_by?: string | null
          closing_cash_cents?: number | null
          closing_notes?: string | null
          created_at?: string
          device_id?: string | null
          device_session_id?: string | null
          expected_cash_cents?: number | null
          id?: string
          opened_at?: string
          opened_by?: string
          opening_cash_cents?: number
          opening_notes?: string | null
          org_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_shifts_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_shifts_device_session_id_fkey"
            columns: ["device_session_id"]
            isOneToOne: false
            referencedRelation: "device_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_shifts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_shifts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_public"
            referencedColumns: ["id"]
          },
        ]
      }
      price_rule_redemptions: {
        Row: {
          id: string
          order_id: string | null
          price_rule_id: string
          redeemed_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          order_id?: string | null
          price_rule_id: string
          redeemed_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          order_id?: string | null
          price_rule_id?: string
          redeemed_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_rule_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "mv_revenue_breakdown"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "price_rule_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_financials"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "price_rule_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_rule_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "price_rule_redemptions_price_rule_id_fkey"
            columns: ["price_rule_id"]
            isOneToOne: false
            referencedRelation: "price_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      price_rules: {
        Row: {
          applies_to: string
          channel: Database["public"]["Enums"]["sales_channel"][] | null
          code: string | null
          created_at: string | null
          ends_at: string | null
          event_id: string | null
          id: string
          is_active: boolean | null
          max_redemptions: number | null
          org_id: string
          per_user_limit: number | null
          starts_at: string | null
          ticket_type_id: string | null
          type: Database["public"]["Enums"]["price_rule_type"]
          value_numeric: number
        }
        Insert: {
          applies_to?: string
          channel?: Database["public"]["Enums"]["sales_channel"][] | null
          code?: string | null
          created_at?: string | null
          ends_at?: string | null
          event_id?: string | null
          id?: string
          is_active?: boolean | null
          max_redemptions?: number | null
          org_id: string
          per_user_limit?: number | null
          starts_at?: string | null
          ticket_type_id?: string | null
          type: Database["public"]["Enums"]["price_rule_type"]
          value_numeric: number
        }
        Update: {
          applies_to?: string
          channel?: Database["public"]["Enums"]["sales_channel"][] | null
          code?: string | null
          created_at?: string | null
          ends_at?: string | null
          event_id?: string | null
          id?: string
          is_active?: boolean | null
          max_redemptions?: number | null
          org_id?: string
          per_user_limit?: number | null
          starts_at?: string | null
          ticket_type_id?: string | null
          type?: Database["public"]["Enums"]["price_rule_type"]
          value_numeric?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_rules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "admin_event_readiness"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "price_rules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_catalog"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "price_rules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "price_rules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_rules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mv_event_sales"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "price_rules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_artist_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_rules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_kpis"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "price_rules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_rules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_sales_public"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "price_rules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_rules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_inbound_transfers"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "price_rules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "price_rules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_rules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_public_event_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_rules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_rules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_rules_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_rules_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["ticket_type_id"]
          },
        ]
      }
      pricing_plans: {
        Row: {
          active: boolean
          created_at: string
          currency: string
          effective_from: string
          id: string
          max_platform_fee_cents: number | null
          min_platform_fee_cents: number | null
          org_id: string
          platform_fee_payer: Database["public"]["Enums"]["fee_payer"]
          platform_fixed_cents: number
          platform_percent_bps: number
          processor_fee_payer: Database["public"]["Enums"]["fee_payer"]
          processor_fixed_cents: number
          processor_percent_bps: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          currency?: string
          effective_from?: string
          id?: string
          max_platform_fee_cents?: number | null
          min_platform_fee_cents?: number | null
          org_id: string
          platform_fee_payer?: Database["public"]["Enums"]["fee_payer"]
          platform_fixed_cents?: number
          platform_percent_bps?: number
          processor_fee_payer?: Database["public"]["Enums"]["fee_payer"]
          processor_fixed_cents?: number
          processor_percent_bps?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          currency?: string
          effective_from?: string
          id?: string
          max_platform_fee_cents?: number | null
          min_platform_fee_cents?: number | null
          org_id?: string
          platform_fee_payer?: Database["public"]["Enums"]["fee_payer"]
          platform_fixed_cents?: number
          platform_percent_bps?: number
          processor_fee_payer?: Database["public"]["Enums"]["fee_payer"]
          processor_fixed_cents?: number
          processor_percent_bps?: number
        }
        Relationships: [
          {
            foreignKeyName: "pricing_plans_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_plans_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          locale: string
          name: string | null
          phone: string | null
          surname: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          locale?: string
          name?: string | null
          phone?: string | null
          surname?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          locale?: string
          name?: string | null
          phone?: string | null
          surname?: string | null
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
          last_seen_at: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_seen_at?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_seen_at?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          bucket: string
          hits: number
          window_start: string
        }
        Insert: {
          bucket: string
          hits?: number
          window_start: string
        }
        Update: {
          bucket?: string
          hits?: number
          window_start?: string
        }
        Relationships: []
      }
      refund_items: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          order_item_id: string | null
          reason: string | null
          refund_id: string
          user_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency: string
          id?: string
          order_item_id?: string | null
          reason?: string | null
          refund_id: string
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          order_item_id?: string | null
          reason?: string | null
          refund_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refund_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["order_item_id"]
          },
          {
            foreignKeyName: "refund_items_refund_id_fkey"
            columns: ["refund_id"]
            isOneToOne: false
            referencedRelation: "refunds"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount_cents: number
          created_at: string | null
          currency: string
          id: string
          initiated_by: string | null
          payment_id: string
          processed_at: string | null
          provider_payload: Json | null
          provider_ref: string | null
          status: Database["public"]["Enums"]["refund_status"]
          type: Database["public"]["Enums"]["refund_type"]
        }
        Insert: {
          amount_cents: number
          created_at?: string | null
          currency: string
          id?: string
          initiated_by?: string | null
          payment_id: string
          processed_at?: string | null
          provider_payload?: Json | null
          provider_ref?: string | null
          status?: Database["public"]["Enums"]["refund_status"]
          type?: Database["public"]["Enums"]["refund_type"]
        }
        Update: {
          amount_cents?: number
          created_at?: string | null
          currency?: string
          id?: string
          initiated_by?: string | null
          payment_id?: string
          processed_at?: string | null
          provider_payload?: Json | null
          provider_ref?: string | null
          status?: Database["public"]["Enums"]["refund_status"]
          type?: Database["public"]["Enums"]["refund_type"]
        }
        Relationships: [
          {
            foreignKeyName: "refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      resale_listings: {
        Row: {
          created_at: string | null
          currency: string
          id: string
          listing_expires_at: string | null
          metadata: Json | null
          order_item_id: string
          org_id: string
          price_cents: number
          seller_id: string | null
          status: string
          transfer_fee_cents: number | null
          transfer_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string
          id?: string
          listing_expires_at?: string | null
          metadata?: Json | null
          order_item_id: string
          org_id: string
          price_cents: number
          seller_id?: string | null
          status?: string
          transfer_fee_cents?: number | null
          transfer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string
          id?: string
          listing_expires_at?: string | null
          metadata?: Json | null
          order_item_id?: string
          org_id?: string
          price_cents?: number
          seller_id?: string | null
          status?: string
          transfer_fee_cents?: number | null
          transfer_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resale_listings_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resale_listings_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["order_item_id"]
          },
          {
            foreignKeyName: "resale_listings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resale_listings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resale_listings_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "transfers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resale_listings_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "v_inbound_transfers"
            referencedColumns: ["transfer_id"]
          },
        ]
      }
      scans: {
        Row: {
          device_id: string | null
          device_session_id: string | null
          event_id: string
          gate: string | null
          id: string
          notes: string | null
          order_item_id: string | null
          outcome: string
          request_hash: string | null
          scanned_at: string
          source_ip: unknown
          ticket_code: string
        }
        Insert: {
          device_id?: string | null
          device_session_id?: string | null
          event_id: string
          gate?: string | null
          id?: string
          notes?: string | null
          order_item_id?: string | null
          outcome: string
          request_hash?: string | null
          scanned_at?: string
          source_ip?: unknown
          ticket_code: string
        }
        Update: {
          device_id?: string | null
          device_session_id?: string | null
          event_id?: string
          gate?: string | null
          id?: string
          notes?: string | null
          order_item_id?: string | null
          outcome?: string
          request_hash?: string | null
          scanned_at?: string
          source_ip?: unknown
          ticket_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "scans_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scans_device_session_id_fkey"
            columns: ["device_session_id"]
            isOneToOne: false
            referencedRelation: "device_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scans_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "admin_event_readiness"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "scans_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_catalog"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "scans_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "scans_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scans_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mv_event_sales"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "scans_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_artist_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scans_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_kpis"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "scans_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scans_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_sales_public"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "scans_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scans_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_inbound_transfers"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "scans_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "scans_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scans_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_public_event_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scans_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scans_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["order_item_id"]
          },
        ]
      }
      seat_holds: {
        Row: {
          created_at: string | null
          created_by: string | null
          event_id: string
          expires_at: string | null
          hold_code: string | null
          id: string
          quantity: number
          status: Database["public"]["Enums"]["seat_hold_status"]
          ticket_type_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          event_id: string
          expires_at?: string | null
          hold_code?: string | null
          id?: string
          quantity: number
          status?: Database["public"]["Enums"]["seat_hold_status"]
          ticket_type_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          event_id?: string
          expires_at?: string | null
          hold_code?: string | null
          id?: string
          quantity?: number
          status?: Database["public"]["Enums"]["seat_hold_status"]
          ticket_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seat_holds_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "admin_event_readiness"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "seat_holds_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_catalog"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "seat_holds_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "seat_holds_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_holds_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mv_event_sales"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "seat_holds_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_artist_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_holds_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_kpis"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "seat_holds_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_holds_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_sales_public"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "seat_holds_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_holds_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_inbound_transfers"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "seat_holds_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "seat_holds_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_holds_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_public_event_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_holds_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_holds_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["ticket_type_id"]
          },
        ]
      }
      seat_maps: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          schema: Json
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          schema: Json
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          schema?: Json
        }
        Relationships: [
          {
            foreignKeyName: "seat_maps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "admin_event_readiness"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "seat_maps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_catalog"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "seat_maps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "seat_maps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_maps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mv_event_sales"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "seat_maps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_artist_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_maps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_kpis"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "seat_maps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_maps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_sales_public"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "seat_maps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_maps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_inbound_transfers"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "seat_maps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "seat_maps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_maps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_public_event_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      seat_reservations: {
        Row: {
          active: boolean | null
          created_at: string | null
          event_id: string
          expires_at: string
          id: string
          seat_id: string
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          event_id: string
          expires_at: string
          id?: string
          seat_id: string
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          event_id?: string
          expires_at?: string
          id?: string
          seat_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seat_reservations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "admin_event_readiness"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "seat_reservations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_catalog"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "seat_reservations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "seat_reservations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_reservations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mv_event_sales"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "seat_reservations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_artist_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_reservations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_kpis"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "seat_reservations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_reservations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_sales_public"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "seat_reservations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_reservations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_inbound_transfers"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "seat_reservations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "seat_reservations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_reservations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_public_event_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_reservations_seat_id_fkey"
            columns: ["seat_id"]
            isOneToOne: false
            referencedRelation: "seats"
            referencedColumns: ["id"]
          },
        ]
      }
      seats: {
        Row: {
          created_at: string | null
          id: string
          label: string
          seat_map_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          label: string
          seat_map_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          label?: string
          seat_map_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seats_seat_map_id_fkey"
            columns: ["seat_map_id"]
            isOneToOne: false
            referencedRelation: "seat_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      series_follows: {
        Row: {
          created_at: string
          id: string
          series_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          series_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          series_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "series_follows_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "event_series"
            referencedColumns: ["id"]
          },
        ]
      }
      tapband_alerts: {
        Row: {
          alert_key: string
          correlation_id: string | null
          created_at: string
          details: Json
          device_id: string | null
          event_id: string | null
          first_seen_at: string
          id: string
          last_seen_at: string
          message: string
          org_id: string | null
          resolved_at: string | null
          severity: string
          status: string
          title: string
        }
        Insert: {
          alert_key: string
          correlation_id?: string | null
          created_at?: string
          details?: Json
          device_id?: string | null
          event_id?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          message: string
          org_id?: string | null
          resolved_at?: string | null
          severity: string
          status?: string
          title: string
        }
        Update: {
          alert_key?: string
          correlation_id?: string | null
          created_at?: string
          details?: Json
          device_id?: string | null
          event_id?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          message?: string
          org_id?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tapband_alerts_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tapband_alerts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "admin_event_readiness"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "tapband_alerts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_catalog"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "tapband_alerts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "tapband_alerts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tapband_alerts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mv_event_sales"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "tapband_alerts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_artist_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tapband_alerts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_kpis"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "tapband_alerts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tapband_alerts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_sales_public"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "tapband_alerts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tapband_alerts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_inbound_transfers"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "tapband_alerts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "tapband_alerts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tapband_alerts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_public_event_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tapband_alerts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tapband_alerts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_public"
            referencedColumns: ["id"]
          },
        ]
      }
      tapband_feature_configs: {
        Row: {
          activation_enabled: boolean
          allowed_chip_families: string[]
          allowed_key_versions: string[]
          created_at: string
          created_by: string | null
          credential_lookup_enabled: boolean
          desfire_secure_mode_enabled: boolean
          effective_within_seconds: number
          enabled: boolean
          environment: string
          event_id: string | null
          id: string
          lost_replacement_enabled: boolean
          manifest_validity_seconds: number
          notes: string | null
          offline_manifest_issuance_enabled: boolean
          offline_nfc_scanning_enabled: boolean
          online_nfc_scanning_enabled: boolean
          org_id: string | null
          outlet_id: string | null
          outlet_lookup_enabled: boolean
          outlet_sales_enabled: boolean
          outlet_verification_requirement: string
          product_visibility_enabled: boolean
          provisioning_enabled: boolean
          public_client_config: Json
          qr_fallback_enabled: boolean
          replacement_fee_cents: number
          replacement_fee_waiver_enabled: boolean
          supported_entry_zones: string[]
          tap_debounce_ms: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activation_enabled?: boolean
          allowed_chip_families?: string[]
          allowed_key_versions?: string[]
          created_at?: string
          created_by?: string | null
          credential_lookup_enabled?: boolean
          desfire_secure_mode_enabled?: boolean
          effective_within_seconds?: number
          enabled?: boolean
          environment?: string
          event_id?: string | null
          id?: string
          lost_replacement_enabled?: boolean
          manifest_validity_seconds?: number
          notes?: string | null
          offline_manifest_issuance_enabled?: boolean
          offline_nfc_scanning_enabled?: boolean
          online_nfc_scanning_enabled?: boolean
          org_id?: string | null
          outlet_id?: string | null
          outlet_lookup_enabled?: boolean
          outlet_sales_enabled?: boolean
          outlet_verification_requirement?: string
          product_visibility_enabled?: boolean
          provisioning_enabled?: boolean
          public_client_config?: Json
          qr_fallback_enabled?: boolean
          replacement_fee_cents?: number
          replacement_fee_waiver_enabled?: boolean
          supported_entry_zones?: string[]
          tap_debounce_ms?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activation_enabled?: boolean
          allowed_chip_families?: string[]
          allowed_key_versions?: string[]
          created_at?: string
          created_by?: string | null
          credential_lookup_enabled?: boolean
          desfire_secure_mode_enabled?: boolean
          effective_within_seconds?: number
          enabled?: boolean
          environment?: string
          event_id?: string | null
          id?: string
          lost_replacement_enabled?: boolean
          manifest_validity_seconds?: number
          notes?: string | null
          offline_manifest_issuance_enabled?: boolean
          offline_nfc_scanning_enabled?: boolean
          online_nfc_scanning_enabled?: boolean
          org_id?: string | null
          outlet_id?: string | null
          outlet_lookup_enabled?: boolean
          outlet_sales_enabled?: boolean
          outlet_verification_requirement?: string
          product_visibility_enabled?: boolean
          provisioning_enabled?: boolean
          public_client_config?: Json
          qr_fallback_enabled?: boolean
          replacement_fee_cents?: number
          replacement_fee_waiver_enabled?: boolean
          supported_entry_zones?: string[]
          tap_debounce_ms?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tapband_feature_configs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "admin_event_readiness"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "tapband_feature_configs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_catalog"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "tapband_feature_configs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "tapband_feature_configs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tapband_feature_configs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mv_event_sales"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "tapband_feature_configs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_artist_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tapband_feature_configs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_kpis"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "tapband_feature_configs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tapband_feature_configs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_sales_public"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "tapband_feature_configs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tapband_feature_configs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_inbound_transfers"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "tapband_feature_configs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "tapband_feature_configs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tapband_feature_configs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_public_event_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tapband_feature_configs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tapband_feature_configs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_public"
            referencedColumns: ["id"]
          },
        ]
      }
      tapband_kill_switches: {
        Row: {
          capability: string | null
          created_at: string
          created_by: string | null
          enabled: boolean
          ends_at: string | null
          environment: string
          event_id: string | null
          id: string
          org_id: string | null
          reason: string
          reason_code: string
          revoked_at: string | null
          revoked_by: string | null
          starts_at: string
          switch_type: string
          target_ref: string | null
        }
        Insert: {
          capability?: string | null
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          ends_at?: string | null
          environment?: string
          event_id?: string | null
          id?: string
          org_id?: string | null
          reason: string
          reason_code: string
          revoked_at?: string | null
          revoked_by?: string | null
          starts_at?: string
          switch_type: string
          target_ref?: string | null
        }
        Update: {
          capability?: string | null
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          ends_at?: string | null
          environment?: string
          event_id?: string | null
          id?: string
          org_id?: string | null
          reason?: string
          reason_code?: string
          revoked_at?: string | null
          revoked_by?: string | null
          starts_at?: string
          switch_type?: string
          target_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tapband_kill_switches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "admin_event_readiness"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "tapband_kill_switches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_catalog"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "tapband_kill_switches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "tapband_kill_switches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tapband_kill_switches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mv_event_sales"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "tapband_kill_switches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_artist_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tapband_kill_switches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_kpis"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "tapband_kill_switches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tapband_kill_switches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_sales_public"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "tapband_kill_switches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tapband_kill_switches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_inbound_transfers"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "tapband_kill_switches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "tapband_kill_switches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tapband_kill_switches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_public_event_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tapband_kill_switches_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tapband_kill_switches_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_public"
            referencedColumns: ["id"]
          },
        ]
      }
      tapband_telemetry_events: {
        Row: {
          actor_hash: string | null
          channel: string | null
          correlation_id: string | null
          credential_hash: string | null
          device_id: string | null
          event_id: string | null
          event_type: string
          id: string
          ingested_at: string
          latency_ms: number | null
          metadata: Json
          occurred_at: string
          org_id: string | null
          outcome: string | null
          reader_id: string | null
          serial_hash: string | null
          severity: string
        }
        Insert: {
          actor_hash?: string | null
          channel?: string | null
          correlation_id?: string | null
          credential_hash?: string | null
          device_id?: string | null
          event_id?: string | null
          event_type: string
          id?: string
          ingested_at?: string
          latency_ms?: number | null
          metadata?: Json
          occurred_at?: string
          org_id?: string | null
          outcome?: string | null
          reader_id?: string | null
          serial_hash?: string | null
          severity?: string
        }
        Update: {
          actor_hash?: string | null
          channel?: string | null
          correlation_id?: string | null
          credential_hash?: string | null
          device_id?: string | null
          event_id?: string | null
          event_type?: string
          id?: string
          ingested_at?: string
          latency_ms?: number | null
          metadata?: Json
          occurred_at?: string
          org_id?: string | null
          outcome?: string | null
          reader_id?: string | null
          serial_hash?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "tapband_telemetry_events_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tapband_telemetry_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "admin_event_readiness"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "tapband_telemetry_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_catalog"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "tapband_telemetry_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "tapband_telemetry_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tapband_telemetry_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mv_event_sales"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "tapband_telemetry_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_artist_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tapband_telemetry_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_kpis"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "tapband_telemetry_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tapband_telemetry_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_sales_public"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "tapband_telemetry_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tapband_telemetry_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_inbound_transfers"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "tapband_telemetry_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "tapband_telemetry_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tapband_telemetry_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_public_event_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tapband_telemetry_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tapband_telemetry_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_public"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_type_channels: {
        Row: {
          channel: Database["public"]["Enums"]["sales_channel"]
          per_order_limit: number | null
          quota: number | null
          ticket_type_id: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["sales_channel"]
          per_order_limit?: number | null
          quota?: number | null
          ticket_type_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["sales_channel"]
          per_order_limit?: number | null
          quota?: number | null
          ticket_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_type_channels_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_type_channels_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["ticket_type_id"]
          },
        ]
      }
      ticket_types: {
        Row: {
          created_at: string | null
          currency: string
          event_id: string
          id: string
          is_reserved_seating: boolean | null
          name: string
          per_user_limit: number | null
          price_cents: number
          quota: number
          sales_pause_reason: string | null
          sales_paused_at: string | null
          sales_status: Database["public"]["Enums"]["ticket_type_sales_status"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string
          event_id: string
          id?: string
          is_reserved_seating?: boolean | null
          name: string
          per_user_limit?: number | null
          price_cents: number
          quota: number
          sales_pause_reason?: string | null
          sales_paused_at?: string | null
          sales_status?: Database["public"]["Enums"]["ticket_type_sales_status"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string
          event_id?: string
          id?: string
          is_reserved_seating?: boolean | null
          name?: string
          per_user_limit?: number | null
          price_cents?: number
          quota?: number
          sales_pause_reason?: string | null
          sales_paused_at?: string | null
          sales_status?: Database["public"]["Enums"]["ticket_type_sales_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "admin_event_readiness"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_catalog"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mv_event_sales"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_artist_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_kpis"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_sales_public"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_inbound_transfers"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_public_event_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          created_at: string | null
          from_user_id: string | null
          id: string
          metadata: Json | null
          order_item_id: string | null
          status: Database["public"]["Enums"]["transfer_status"]
          to_user_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          from_user_id?: string | null
          id?: string
          metadata?: Json | null
          order_item_id?: string | null
          status?: Database["public"]["Enums"]["transfer_status"]
          to_user_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          from_user_id?: string | null
          id?: string
          metadata?: Json | null
          order_item_id?: string | null
          status?: Database["public"]["Enums"]["transfer_status"]
          to_user_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transfers_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["order_item_id"]
          },
        ]
      }
      user_connections: {
        Row: {
          id: string
          recipient_id: string
          requested_at: string
          requester_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["connection_status"]
        }
        Insert: {
          id?: string
          recipient_id: string
          requested_at?: string
          requester_id: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["connection_status"]
        }
        Update: {
          id?: string
          recipient_id?: string
          requested_at?: string
          requester_id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["connection_status"]
        }
        Relationships: []
      }
      user_handles: {
        Row: {
          created_at: string
          handle: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          handle: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          handle?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notification_preferences: {
        Row: {
          email_opt_in: boolean
          in_app_opt_in: boolean
          preferred_channel: string | null
          push_opt_in: boolean
          sms_opt_in: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          email_opt_in?: boolean
          in_app_opt_in?: boolean
          preferred_channel?: string | null
          push_opt_in?: boolean
          sms_opt_in?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          email_opt_in?: boolean
          in_app_opt_in?: boolean
          preferred_channel?: string | null
          push_opt_in?: boolean
          sms_opt_in?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      venues: {
        Row: {
          address: string | null
          capacity: number | null
          city: string | null
          city_key: string | null
          created_at: string | null
          id: string
          name: string
          name_key: string | null
          org_id: string | null
          slug: string
          tz: string | null
        }
        Insert: {
          address?: string | null
          capacity?: number | null
          city?: string | null
          city_key?: string | null
          created_at?: string | null
          id?: string
          name: string
          name_key?: string | null
          org_id?: string | null
          slug: string
          tz?: string | null
        }
        Update: {
          address?: string | null
          capacity?: number | null
          city?: string | null
          city_key?: string | null
          created_at?: string | null
          id?: string
          name?: string
          name_key?: string | null
          org_id?: string | null
          slug?: string
          tz?: string | null
        }
        Relationships: []
      }
      waitlists: {
        Row: {
          created_at: string | null
          email: string | null
          event_id: string
          first_name: string | null
          id: string
          joined_at: string
          last_name: string | null
          notified_at: string | null
          offer_expires_at: string | null
          quantity_requested: number
          status: string
          ticket_type_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          event_id: string
          first_name?: string | null
          id?: string
          joined_at?: string
          last_name?: string | null
          notified_at?: string | null
          offer_expires_at?: string | null
          quantity_requested?: number
          status?: string
          ticket_type_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          event_id?: string
          first_name?: string | null
          id?: string
          joined_at?: string
          last_name?: string | null
          notified_at?: string | null
          offer_expires_at?: string | null
          quantity_requested?: number
          status?: string
          ticket_type_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waitlists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "admin_event_readiness"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "waitlists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_catalog"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "waitlists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "waitlists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mv_event_sales"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "waitlists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_artist_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_kpis"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "waitlists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_sales_public"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "waitlists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_inbound_transfers"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "waitlists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "waitlists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_public_event_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlists_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlists_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["ticket_type_id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          attempt_no: number
          created_at: string
          delivered_at: string | null
          duration_ms: number | null
          endpoint_id: string
          event_type: string
          id: string
          next_retry_at: string | null
          payload: Json
          response_body: string | null
          response_status: number | null
        }
        Insert: {
          attempt_no?: number
          created_at?: string
          delivered_at?: string | null
          duration_ms?: number | null
          endpoint_id: string
          event_type: string
          id?: string
          next_retry_at?: string | null
          payload?: Json
          response_body?: string | null
          response_status?: number | null
        }
        Update: {
          attempt_no?: number
          created_at?: string
          delivered_at?: string | null
          duration_ms?: number | null
          endpoint_id?: string
          event_type?: string
          id?: string
          next_retry_at?: string | null
          payload?: Json
          response_body?: string | null
          response_status?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          events: string[]
          id: string
          is_active: boolean
          last_delivery_at: string | null
          last_status_code: number | null
          org_id: string | null
          secret: string | null
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          events?: string[]
          id?: string
          is_active?: boolean
          last_delivery_at?: string | null
          last_status_code?: number | null
          org_id?: string | null
          secret?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          events?: string[]
          id?: string
          is_active?: boolean
          last_delivery_at?: string | null
          last_status_code?: number | null
          org_id?: string | null
          secret?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_endpoints_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_endpoints_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_public"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          id: string
          payload: Json
          processed_at: string | null
          provider: string
          provider_event_id: string | null
          received_at: string
          signature: string | null
        }
        Insert: {
          id?: string
          payload: Json
          processed_at?: string | null
          provider: string
          provider_event_id?: string | null
          received_at?: string
          signature?: string | null
        }
        Update: {
          id?: string
          payload?: Json
          processed_at?: string | null
          provider?: string
          provider_event_id?: string | null
          received_at?: string
          signature?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      admin_attention_queue: {
        Row: {
          created_at: string | null
          detail: string | null
          href: string | null
          kind: string | null
          record_id: string | null
          title: string | null
        }
        Relationships: []
      }
      admin_command_centre_metrics: {
        Row: {
          draft_events: number | null
          failed_jobs: number | null
          failed_payment_attempts: number | null
          failed_payments: number | null
          gross_revenue_cents: number | null
          open_refund_cents: number | null
          open_refunds: number | null
          paid_orders: number | null
          pending_payout_cents: number | null
          pending_payouts: number | null
          platform_fee_cents: number | null
          published_events: number | null
          scans_last_24h: number | null
          ticket_types: number | null
          tickets_checked_in: number | null
          tickets_issued: number | null
          total_events: number | null
          total_orders: number | null
          total_organizations: number | null
          unprocessed_webhooks: number | null
          upcoming_events: number | null
        }
        Relationships: []
      }
      admin_event_readiness: {
        Row: {
          checks: Json | null
          cover_image_url: string | null
          description: string | null
          ends_at: string | null
          event_id: string | null
          has_active_pricing_plan: boolean | null
          has_payout_account: boolean | null
          on_sale_ticket_types: number | null
          org_id: string | null
          starts_at: string | null
          status: Database["public"]["Enums"]["event_status"] | null
          title: string | null
          venue_id: string | null
          visibility: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_recent_operations: {
        Row: {
          action: string | null
          entity: string | null
          entity_id: string | null
          occurred_at: string | null
          record_id: string | null
          source: string | null
        }
        Relationships: []
      }
      admin_workspace_actions: {
        Row: {
          backend_function: string | null
          created_at: string | null
          description: string | null
          is_enabled: boolean | null
          key: string | null
          label: string | null
          target_table: string | null
          workspace_key: string | null
        }
        Insert: {
          backend_function?: string | null
          created_at?: string | null
          description?: string | null
          is_enabled?: boolean | null
          key?: string | null
          label?: string | null
          target_table?: string | null
          workspace_key?: string | null
        }
        Update: {
          backend_function?: string | null
          created_at?: string | null
          description?: string | null
          is_enabled?: boolean | null
          key?: string | null
          label?: string | null
          target_table?: string | null
          workspace_key?: string | null
        }
        Relationships: []
      }
      admin_workspace_operating_counts: {
        Row: {
          active_count: number | null
          closed_count: number | null
          needs_review_count: number | null
          workspace_key: string | null
        }
        Relationships: []
      }
      event_catalog: {
        Row: {
          city: string | null
          country_code: string | null
          cover_image_url: string | null
          event_id: string | null
          org_id: string | null
          slug: string | null
          starts_at: string | null
          ticket_types: Json | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_public"
            referencedColumns: ["id"]
          },
        ]
      }
      event_summary: {
        Row: {
          dates_count: number | null
          event_id: string | null
          org_id: string | null
          slug: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_public"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_event_sales: {
        Row: {
          event_id: string | null
          gross_cents: number | null
          paid_orders: number | null
          tickets_issued: number | null
          tickets_sold: number | null
        }
        Relationships: []
      }
      mv_revenue_breakdown: {
        Row: {
          day: string | null
          event_id: string | null
          oi_order_id: string | null
          order_id: string | null
          org_id: string | null
          revenue_cents: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["oi_order_id"]
            isOneToOne: false
            referencedRelation: "mv_revenue_breakdown"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["oi_order_id"]
            isOneToOne: false
            referencedRelation: "order_financials"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["oi_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["oi_order_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "admin_event_readiness"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_catalog"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mv_event_sales"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_artist_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_kpis"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_sales_public"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_inbound_transfers"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_public_event_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      order_financials: {
        Row: {
          created_at: string | null
          currency: string | null
          item_count: number | null
          order_id: string | null
          org_id: string | null
          organizer_gross_if_buyer_pays_fees: number | null
          platform_fee_cents: number | null
          platform_fixed_cents: number | null
          platform_percent_bps: number | null
          processor_fee_cents: number | null
          processor_fixed_cents: number | null
          processor_percent_bps: number | null
          status: Database["public"]["Enums"]["order_status"] | null
          subtotal_cents: number | null
          total_cents: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_public"
            referencedColumns: ["id"]
          },
        ]
      }
      order_ledger_summary: {
        Row: {
          gross_cents: number | null
          net_cents: number | null
          order_id: string | null
          payment_net_cents: number | null
          refund_cents: number | null
        }
        Relationships: []
      }
      user_friends: {
        Row: {
          connected_at: string | null
          connection_id: string | null
          friend_id: string | null
        }
        Insert: {
          connected_at?: string | null
          connection_id?: string | null
          friend_id?: never
        }
        Update: {
          connected_at?: string | null
          connection_id?: string | null
          friend_id?: never
        }
        Relationships: []
      }
      v_artist_events_public: {
        Row: {
          artist_id: string | null
          category: string | null
          city: string | null
          country: string | null
          currency: string | null
          id: string | null
          max_price_cents: number | null
          min_price_cents: number | null
          organizer_id: string | null
          organizer_logo_url: string | null
          organizer_name: string | null
          poster_url: string | null
          slug: string | null
          starts_at: string | null
          title: string | null
          venue_address: string | null
          venue_id: string | null
          venue_name: string | null
          venue_tz: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_artists_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_artists_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "v_artist_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_artists_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "v_event_lineup_public"
            referencedColumns: ["artist_id"]
          },
          {
            foreignKeyName: "events_org_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_org_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      v_artist_public: {
        Row: {
          bio: string | null
          genre: string | null
          id: string | null
          name: string | null
          photo_url: string | null
          slug: string | null
          social_links: Json | null
        }
        Insert: {
          bio?: string | null
          genre?: never
          id?: string | null
          name?: string | null
          photo_url?: string | null
          slug?: string | null
          social_links?: never
        }
        Update: {
          bio?: string | null
          genre?: never
          id?: string | null
          name?: string | null
          photo_url?: string | null
          slug?: string | null
          social_links?: never
        }
        Relationships: []
      }
      v_event_friends_going: {
        Row: {
          event_id: string | null
          friend_handle: string | null
          friend_id: string | null
          friend_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "admin_event_readiness"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_catalog"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mv_event_sales"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_artist_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_kpis"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_sales_public"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_inbound_transfers"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_public_event_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      v_event_kpis: {
        Row: {
          currency: string | null
          event_id: string | null
          org_id: string | null
          paid_orders: number | null
          revenue_cents: number | null
          slug: string | null
          tickets_checked_in: number | null
          tickets_issued: number | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_public"
            referencedColumns: ["id"]
          },
        ]
      }
      v_event_lineup_public: {
        Row: {
          artist_id: string | null
          artist_image_url: string | null
          artist_name: string | null
          artist_slug: string | null
          event_id: string | null
          role: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_artists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "admin_event_readiness"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_artists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_catalog"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_artists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_artists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_artists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mv_event_sales"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_artists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_artist_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_artists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_kpis"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_artists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_artists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_sales_public"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_artists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_artists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_inbound_transfers"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_artists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_artists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_artists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_public_event_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      v_event_public: {
        Row: {
          category: string | null
          city: string | null
          country: string | null
          currency: string | null
          description: string | null
          id: string | null
          max_price_cents: number | null
          min_price_cents: number | null
          organizer_id: string | null
          organizer_logo_url: string | null
          organizer_name: string | null
          poster_url: string | null
          slug: string | null
          starts_at: string | null
          title: string | null
          venue_address: string | null
          venue_capacity: number | null
          venue_id: string | null
          venue_name: string | null
          venue_tz: string | null
          visibility: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_org_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_org_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      v_event_sales_public: {
        Row: {
          event_id: string | null
          gross_revenue_cents: number | null
          tickets_sold: number | null
        }
        Relationships: []
      }
      v_events_public: {
        Row: {
          category: string | null
          city: string | null
          country: string | null
          currency: string | null
          featured_priority: number | null
          id: string | null
          max_price_cents: number | null
          min_price_cents: number | null
          organizer_id: string | null
          organizer_logo_url: string | null
          organizer_name: string | null
          poster_url: string | null
          slug: string | null
          starts_at: string | null
          title: string | null
          venue_address: string | null
          venue_id: string | null
          venue_name: string | null
          venue_tz: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_org_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_org_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      v_inbound_transfers: {
        Row: {
          cover_image_url: string | null
          currency: string | null
          event_id: string | null
          event_starts_at: string | null
          event_title: string | null
          expires_at: string | null
          from_handle: string | null
          from_name: string | null
          from_user_id: string | null
          offered_at: string | null
          order_item_id: string | null
          price_cents: number | null
          status: Database["public"]["Enums"]["transfer_status"] | null
          ticket_code: string | null
          ticket_type_id: string | null
          ticket_type_name: string | null
          to_user_id: string | null
          transfer_id: string | null
          updated_at: string | null
          venue_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["ticket_type_id"]
          },
          {
            foreignKeyName: "transfers_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["order_item_id"]
          },
        ]
      }
      v_my_order_ledger_summary: {
        Row: {
          gross_cents: number | null
          net_cents: number | null
          order_id: string | null
          payment_net_cents: number | null
          refund_cents: number | null
        }
        Relationships: []
      }
      v_my_tickets: {
        Row: {
          buyer_id: string | null
          checked_in_at: string | null
          city: string | null
          cover_image_url: string | null
          currency: string | null
          current_owner_id: string | null
          event_id: string | null
          event_slug: string | null
          event_starts_at: string | null
          event_title: string | null
          order_id: string | null
          order_item_id: string | null
          order_item_status:
            | Database["public"]["Enums"]["order_item_status"]
            | null
          order_status: Database["public"]["Enums"]["order_status"] | null
          ordered_at: string | null
          price_cents: number | null
          refunded_at: string | null
          revoked_at: string | null
          ticket_code: string | null
          ticket_type_id: string | null
          ticket_type_name: string | null
          transferred_from_order_item_id: string | null
          venue_address: string | null
          venue_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_transferred_from_order_item_id_fkey"
            columns: ["transferred_from_order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_transferred_from_order_item_id_fkey"
            columns: ["transferred_from_order_item_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["order_item_id"]
          },
        ]
      }
      v_organizer_events_public: {
        Row: {
          category: string | null
          city: string | null
          country: string | null
          currency: string | null
          id: string | null
          max_price_cents: number | null
          min_price_cents: number | null
          organizer_id: string | null
          organizer_logo_url: string | null
          organizer_name: string | null
          poster_url: string | null
          slug: string | null
          starts_at: string | null
          title: string | null
          venue_address: string | null
          venue_id: string | null
          venue_name: string | null
          venue_tz: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_org_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_org_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      v_organizer_public: {
        Row: {
          bio: string | null
          event_count: number | null
          id: string | null
          logo_url: string | null
          name: string | null
          slug: string | null
          social_links: Json | null
          website: string | null
        }
        Insert: {
          bio?: string | null
          event_count?: never
          id?: string | null
          logo_url?: string | null
          name?: string | null
          slug?: string | null
          social_links?: never
          website?: never
        }
        Update: {
          bio?: string | null
          event_count?: never
          id?: string | null
          logo_url?: string | null
          name?: string | null
          slug?: string | null
          social_links?: never
          website?: never
        }
        Relationships: []
      }
      v_public_event_cards: {
        Row: {
          category: string | null
          checked_in_count: number | null
          city: string | null
          country: string | null
          currency: string | null
          featured_priority: number | null
          id: string | null
          last_order_at: string | null
          last_scan_at: string | null
          live_stats_updated_at: string | null
          max_price_cents: number | null
          min_price_cents: number | null
          organizer_id: string | null
          organizer_logo_url: string | null
          organizer_name: string | null
          poster_url: string | null
          slug: string | null
          starts_at: string | null
          tickets_available: number | null
          tickets_sold: number | null
          title: string | null
          venue_address: string | null
          venue_id: string | null
          venue_name: string | null
          venue_tz: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_org_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_org_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      v_user_events: {
        Row: {
          event_id: string | null
        }
        Insert: {
          event_id?: string | null
        }
        Update: {
          event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_staff_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "admin_event_readiness"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_staff_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_catalog"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_staff_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_staff_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_staff_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mv_event_sales"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_staff_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_artist_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_staff_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_kpis"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_staff_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_staff_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_sales_public"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_staff_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_staff_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_inbound_transfers"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_staff_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_my_tickets"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_staff_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_staff_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_public_event_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      v_user_orgs: {
        Row: {
          org_id: string | null
        }
        Insert: {
          org_id?: string | null
        }
        Update: {
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_organizer_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_log_action: {
        Args: {
          p_action: Database["public"]["Enums"]["audit_action"]
          p_actor_id: string
          p_changes?: Json
          p_org_id?: string
          p_record_id: string
          p_table_name: string
        }
        Returns: undefined
      }
      attach_app_audit: {
        Args: { table_name: string; table_schema: string }
        Returns: undefined
      }
      can_manage_event: {
        Args: { p_event_id: string; p_user: string }
        Returns: boolean
      }
      can_manage_org: {
        Args: { p_org_id: string; p_user: string }
        Returns: boolean
      }
      can_update_ticket_types_by_user: {
        Args: { p_event_id: string; p_user: string }
        Returns: boolean
      }
      compute_order_payment_status: {
        Args: { p_order_id: string }
        Returns: {
          derived_status: string
          expected_total_cents: number
          net_cents: number
        }[]
      }
      create_event_draft: {
        Args: { p_org_id: string; p_title: string; p_visibility?: string }
        Returns: string
      }
      create_event_draft_unchecked: {
        Args: { p_org_id: string; p_title: string; p_visibility?: string }
        Returns: string
      }
      current_user_org_ids: { Args: never; Returns: string[] }
      current_user_uid: { Args: never; Returns: string }
      fn_accept_membership_invite: { Args: { p_token: string }; Returns: Json }
      fn_accept_membership_invite_unchecked: {
        Args: { p_token: string }
        Returns: Json
      }
      fn_admin_schedule_webhook_dispatch: {
        Args: {
          p_anon_jwt: string
          p_function_url: string
          p_schedule?: string
        }
        Returns: Json
      }
      fn_anon_users_to_delete: {
        Args: never
        Returns: {
          reason: string
          user_id: string
        }[]
      }
      fn_apply_pricing_to_order: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      fn_apply_promo_code_to_order: {
        Args: { p_code: string; p_order_id: string; p_user_id: string }
        Returns: Json
      }
      fn_backfill_event_live_stats: { Args: never; Returns: number }
      fn_bootstrap_ticketiv_user: {
        Args: {
          p_display_name?: string
          p_email?: string
          p_phone?: string
          p_user_id: string
        }
        Returns: Json
      }
      fn_bulk_check_in: {
        Args: { p_order_item_ids: string[]; p_org_id: string }
        Returns: {
          checked_count: number
          skipped_count: number
        }[]
      }
      fn_bulk_check_in_unchecked: {
        Args: { p_order_item_ids: string[]; p_org_id: string }
        Returns: {
          checked_count: number
          skipped_count: number
        }[]
      }
      fn_check_in:
        | {
            Args: { p_device_id?: string; p_order_item_id: string }
            Returns: Json
          }
        | { Args: { p_scan_id: string }; Returns: undefined }
        | {
            Args: { p_ticket_code: string }
            Returns: {
              checked_in_at: string
              message: string
              ok: boolean
            }[]
          }
        | {
            Args: {
              p_device_id: string
              p_gate?: string
              p_ticket_code: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_device_id: string
              p_event_id: string
              p_gate: string
              p_ticket_code: string
            }
            Returns: Json
          }
      fn_claim_email_broadcast: {
        Args: {
          p_audience: string
          p_event_id: string
          p_org_id: string
          p_recipient_count: number
          p_subject: string
        }
        Returns: string
      }
      fn_claim_guest_orders: { Args: never; Returns: number }
      fn_cleanup_anon_users: { Args: { p_dry_run?: boolean }; Returns: Json }
      fn_cleanup_anonymous_users: {
        Args: { p_dry_run?: boolean }
        Returns: Json
      }
      fn_close_pos_shift: {
        Args: {
          p_closing_cash_cents: number
          p_notes?: string
          p_shift_id: string
        }
        Returns: Json
      }
      fn_complete_resale_after_payment: {
        Args: { p_listing_id: string; p_payment_id: string }
        Returns: {
          buyer_order_id: string
          buyer_order_item_id: string
          listing_id: string
          transfer_id: string
        }[]
      }
      fn_complete_resale_after_payment_webhook: {
        Args: { p_payment_id: string }
        Returns: {
          already_completed: boolean
          buyer_order_id: string
          buyer_order_item_id: string
          listing_id: string
          transfer_id: string
        }[]
      }
      fn_complete_transfer: { Args: { p_transfer_id: string }; Returns: Json }
      fn_complete_transfer_unchecked: {
        Args: { p_transfer_id: string }
        Returns: Json
      }
      fn_complete_waitlist_after_payment: {
        Args: { p_payment_id: string; p_waitlist_id: string }
        Returns: {
          issued_count: number
          order_id: string
          waitlist_id: string
        }[]
      }
      fn_complete_waitlist_after_payment_webhook: {
        Args: { p_payment_id: string }
        Returns: {
          already_completed: boolean
          issued_count: number
          order_id: string
          waitlist_id: string
        }[]
      }
      fn_create_inventory_protected_order: {
        Args: {
          p_buyer_email: string
          p_buyer_id: string
          p_event_id: string
          p_holder_name?: string
          p_items: Json
        }
        Returns: {
          order_items: Json
          order_row: Json
        }[]
      }
      fn_create_membership_invite: {
        Args: {
          p_event_id?: string
          p_expires_in?: string
          p_invited_email?: string
          p_kind: string
          p_org_id: string
          p_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_by: string
          event_id: string | null
          expires_at: string
          id: string
          invited_email: string | null
          kind: string
          org_id: string
          revoked_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        SetofOptions: {
          from: "*"
          to: "membership_invites"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_create_membership_invite_unchecked: {
        Args: {
          p_event_id?: string
          p_expires_in?: string
          p_invited_email?: string
          p_kind: string
          p_org_id: string
          p_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_by: string
          event_id: string | null
          expires_at: string
          id: string
          invited_email: string | null
          kind: string
          org_id: string
          revoked_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        SetofOptions: {
          from: "*"
          to: "membership_invites"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_create_organization: {
        Args: { p_currency?: string; p_name: string }
        Returns: Json
      }
      fn_create_organization_unchecked: {
        Args: { p_currency?: string; p_name: string }
        Returns: Json
      }
      fn_create_resale_checkout_order: {
        Args: { p_listing_id: string }
        Returns: {
          currency: string
          listing_id: string
          order_id: string
          payment_id: string
          total_cents: number
        }[]
      }
      fn_create_seat_hold:
        | { Args: { p_event_id: string; p_quantity?: number }; Returns: string }
        | {
            Args: {
              p_event_id: string
              p_quantity?: number
              p_ticket_type_id?: string
            }
            Returns: string
          }
      fn_create_talent_profile: { Args: { p_name: string }; Returns: Json }
      fn_create_talent_profile_unchecked: {
        Args: { p_name: string }
        Returns: Json
      }
      fn_create_waitlist_checkout_order: {
        Args: { p_waitlist_id: string }
        Returns: {
          currency: string
          order_id: string
          payment_id: string
          total_cents: number
          waitlist_id: string
        }[]
      }
      fn_db_slow_queries: {
        Args: { p_limit?: number; p_min_mean_ms?: number }
        Returns: {
          calls: number
          mean_exec_ms: number
          query: string
          rows: number
          total_exec_ms: number
        }[]
      }
      fn_deactivate_payment_method: {
        Args: { p_id: string }
        Returns: undefined
      }
      fn_deactivate_payment_method_unchecked: {
        Args: { p_id: string }
        Returns: undefined
      }
      fn_delete_account_for_user: { Args: { p_user_id: string }; Returns: Json }
      fn_delete_organization: {
        Args: { p_confirm_name: string; p_org_id: string }
        Returns: undefined
      }
      fn_delete_organization_unchecked: {
        Args: { p_confirm_name: string; p_org_id: string }
        Returns: undefined
      }
      fn_duplicate_event: { Args: { p_event_id: string }; Returns: Json }
      fn_duplicate_event_unchecked: {
        Args: { p_event_id: string }
        Returns: Json
      }
      fn_end_device_session: {
        Args: { p_session_id: string }
        Returns: {
          device_id: string
          ended_at: string | null
          id: string
          started_at: string | null
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "device_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_enqueue_webhook: {
        Args: { p_event_type: string; p_org_id?: string; p_payload: Json }
        Returns: number
      }
      fn_event_category_slug_exists: {
        Args: { p_slug: string }
        Returns: boolean
      }
      fn_event_is_public_now: { Args: { p_event_id: string }; Returns: boolean }
      fn_event_sales_public: {
        Args: never
        Returns: {
          event_id: string
          gross_revenue_cents: number
          tickets_sold: number
        }[]
      }
      fn_finalize_email_broadcast: {
        Args: {
          p_failed_count: number
          p_notification_id: string
          p_sent_count: number
        }
        Returns: undefined
      }
      fn_find_claimable_guest_orders: {
        Args: never
        Returns: {
          created_at: string
          currency: string
          event_title: string
          item_count: number
          order_id: string
          total_cents: number
        }[]
      }
      fn_get_account_deletion_status_for_user: {
        Args: { p_user_id: string }
        Returns: Json
      }
      fn_get_my_account_deletion_status: { Args: never; Returns: Json }
      fn_get_my_notification_mutes: { Args: never; Returns: string[] }
      fn_get_my_order_totals: {
        Args: { p_order_id: string }
        Returns: Database["public"]["CompositeTypes"]["order_totals"]
        SetofOptions: {
          from: "*"
          to: "order_totals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_get_my_order_totals_json: {
        Args: { p_order_id: string }
        Returns: Json
      }
      fn_get_my_ticketiv_roles: {
        Args: never
        Returns: {
          role_key: string
          role_label: string
          source: string
          source_id: string
          user_id: string
        }[]
      }
      fn_get_or_create_artist: {
        Args: { p_bio?: string; p_image_url?: string; p_name: string }
        Returns: string
      }
      fn_get_or_create_venue: {
        Args: {
          p_address?: string
          p_capacity?: number
          p_city?: string
          p_name: string
          p_tz?: string
        }
        Returns: string
      }
      fn_get_ticketiv_effective_roles: {
        Args: { p_user_id: string }
        Returns: {
          role_key: string
          role_label: string
          source: string
          source_id: string
          user_id: string
        }[]
      }
      fn_is_event_scanner: { Args: { p_event_id: string }; Returns: boolean }
      fn_is_event_staff: {
        Args: {
          p_event_id: string
          p_min_role?: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      fn_issue_guestlist: {
        Args: { p_allocate?: number; p_guestlist_entry_id: string }
        Returns: Json
      }
      fn_issue_guestlist_unchecked: {
        Args: { p_allocate?: number; p_guestlist_entry_id: string }
        Returns: Json
      }
      fn_link_event_artist_by_name: {
        Args: {
          p_artist_name: string
          p_bio?: string
          p_event_id: string
          p_image_url?: string
          p_role?: string
        }
        Returns: string
      }
      fn_link_event_artist_by_name_unchecked: {
        Args: {
          p_artist_name: string
          p_bio?: string
          p_event_id: string
          p_image_url?: string
          p_role?: string
        }
        Returns: string
      }
      fn_list_my_order_totals: {
        Args: { limit_rows?: number; offset_rows?: number }
        Returns: Database["public"]["CompositeTypes"]["order_totals"][]
        SetofOptions: {
          from: "*"
          to: "order_totals"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      fn_mint_tickets: { Args: { p_order_item_id: string }; Returns: undefined }
      fn_my_waitlist_positions: {
        Args: never
        Returns: {
          position: number
          queue_length: number
          waitlist_id: string
        }[]
      }
      fn_normalize_email: { Args: { p: string }; Returns: string }
      fn_normalize_phone: { Args: { p: string }; Returns: string }
      fn_open_pos_shift: {
        Args: {
          p_device_id?: string
          p_device_session_id?: string
          p_notes?: string
          p_opening_cash_cents?: number
          p_org_id: string
        }
        Returns: {
          cash_variance_cents: number | null
          cashier_user_id: string
          closed_at: string | null
          closed_by: string | null
          closing_cash_cents: number | null
          closing_notes: string | null
          created_at: string
          device_id: string | null
          device_session_id: string | null
          expected_cash_cents: number | null
          id: string
          opened_at: string
          opened_by: string
          opening_cash_cents: number
          opening_notes: string | null
          org_id: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "pos_shifts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_complete_order_payment: {
        Args: {
          p_amount_cents?: number
          p_currency?: string
          p_ext_payment_id: string
          p_order_id: string
          p_payload?: Json
          p_provider: string
        }
        Returns: {
          already_completed: boolean
          completed_order_id: string
          completed_payment_id: string
          issued_item_count: number
        }[]
      }
      fn_claim_payment_outbox: {
        Args: { p_limit?: number }
        Returns: {
          attempts: number
          available_at: string
          created_at: string
          id: string
          last_error: string | null
          locked_at: string | null
          order_id: string
          payload: Json
          payment_id: string | null
          status: string
          topic: string
          updated_at: string
        }[]
      }
      fn_resolve_payment_outbox: {
        Args: { p_error?: string; p_id: string; p_ok: boolean }
        Returns: undefined
      }
      fn_org_finance_summary: {
        Args: { p_from?: string; p_org_id: string; p_to?: string }
        Returns: Json
      }
      fn_org_finance_summary_unchecked: {
        Args: { p_from?: string; p_org_id: string; p_to?: string }
        Returns: Json
      }
      fn_pos_charge: {
        Args: {
          p_buyer_email?: string
          p_buyer_name?: string
          p_buyer_phone?: string
          p_event_id: string
          p_items: Json
          p_payment_method: string
        }
        Returns: Json
      }
      fn_pos_charge_unchecked: {
        Args: {
          p_buyer_email?: string
          p_buyer_name?: string
          p_buyer_phone?: string
          p_event_id: string
          p_items: Json
          p_payment_method: string
        }
        Returns: Json
      }
      fn_pos_charge_with_shift: {
        Args: {
          p_buyer_email?: string
          p_buyer_name?: string
          p_buyer_phone?: string
          p_event_id: string
          p_items: Json
          p_payment_method: string
          p_shift_id: string
        }
        Returns: Json
      }
      fn_pos_receipt: { Args: { p_order_id: string }; Returns: Json }
      fn_pos_shift_summary: { Args: { p_shift_id: string }; Returns: Json }
      fn_pos_shift_transactions: {
        Args: { p_limit?: number; p_shift_id: string }
        Returns: Json
      }
      fn_preview_pricing: {
        Args: {
          p_org_id: string
          p_quantities: number[]
          p_ticket_type_ids: string[]
        }
        Returns: Json
      }
      fn_preview_promo_code: {
        Args: {
          p_channel?: Database["public"]["Enums"]["sales_channel"]
          p_code: string
          p_event_id: string
        }
        Returns: Json
      }
      fn_profile_can_read: { Args: { p_user_id: string }; Returns: boolean }
      fn_publish_resale_listing: {
        Args: {
          p_listing_hours?: number
          p_order_item_id: string
          p_price_cents: number
        }
        Returns: {
          currency: string
          listing_expires_at: string
          listing_id: string
          order_item_id: string
          price_cents: number
          transfer_fee_cents: number
        }[]
      }
      fn_publish_resale_listing_unchecked: {
        Args: {
          p_listing_hours?: number
          p_order_item_id: string
          p_price_cents: number
        }
        Returns: {
          currency: string
          listing_expires_at: string
          listing_id: string
          order_item_id: string
          price_cents: number
          transfer_fee_cents: number
        }[]
      }
      fn_quote_order:
        | {
            Args: {
              p_channel: Database["public"]["Enums"]["sales_channel"]
              p_coupon: string
              p_event_id: string
              p_items: Json
            }
            Returns: Json
          }
        | { Args: { p_currency?: string; p_items: Json }; Returns: Json }
      fn_rate_limit: {
        Args: { p_key: string; p_max: number; p_window_seconds: number }
        Returns: boolean
      }
      fn_rate_limit_gc: { Args: { p_older_than?: string }; Returns: number }
      fn_recalculate_event_live_stats: {
        Args: { p_event_id: string }
        Returns: {
          checked_in_count: number
          event_id: string
          failed_payments: number
          gross_sales_cents: number
          last_order_at: string | null
          last_scan_at: string | null
          successful_payments: number
          tickets_available: number
          tickets_sold: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "event_live_stats"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_register_device: {
        Args: {
          p_device_role: Database["public"]["Enums"]["device_role"]
          p_event_id: string
          p_label: string
          p_org_id: string
        }
        Returns: {
          created_at: string | null
          device_role: Database["public"]["Enums"]["device_role"]
          event_id: string | null
          id: string
          label: string | null
          last_seen_at: string | null
          max_scans_per_minute: number | null
          org_id: string
          registered_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "devices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_remove_push_subscription: {
        Args: { p_endpoint: string }
        Returns: undefined
      }
      fn_request_payout: {
        Args: { p_amount_cents: number; p_org_id: string }
        Returns: Json
      }
      fn_request_payout_unchecked: {
        Args: { p_amount_cents: number; p_org_id: string }
        Returns: Json
      }
      fn_request_transfer_by_email: {
        Args: { p_order_item_id: string; p_recipient_email: string }
        Returns: Json
      }
      fn_request_transfer_by_email_unchecked: {
        Args: { p_order_item_id: string; p_recipient_email: string }
        Returns: Json
      }
      fn_revoke_membership_invite: {
        Args: { p_id: string }
        Returns: undefined
      }
      fn_revoke_membership_invite_unchecked: {
        Args: { p_id: string }
        Returns: undefined
      }
      fn_rollup_metrics: { Args: { p_day: string }; Returns: undefined }
      fn_scan_ticket: {
        Args: {
          p_attempt_id?: string
          p_device_id?: string
          p_event_id: string
          p_gate?: string
          p_scanned_at?: string
          p_scanned_by: string
          p_session_id?: string
          p_ticket_code: string
        }
        Returns: Json
      }
      fn_scan_ticket_unchecked: {
        Args: {
          p_attempt_id?: string
          p_device_id?: string
          p_event_id: string
          p_gate?: string
          p_scanned_at?: string
          p_scanned_by: string
          p_session_id?: string
          p_ticket_code: string
        }
        Returns: Json
      }
      fn_search_events: {
        Args: {
          p_category?: string
          p_city?: string
          p_limit?: number
          p_max_price_cents?: number
          p_offset?: number
          p_only_free?: boolean
          p_query?: string
          p_starts_after?: string
          p_starts_before?: string
        }
        Returns: {
          category: string
          city: string
          cover_image_url: string
          currency: string
          id: string
          min_price_cents: number
          organizer_logo_url: string
          organizer_name: string
          rank: number
          slug: string
          starts_at: string
          tickets_sold: number
          title: string
          venue_name: string
        }[]
      }
      fn_seller_completed_resales: {
        Args: { p_seller_ids: string[] }
        Returns: {
          completed_count: number
          seller_id: string
        }[]
      }
      fn_set_default_payment_method: {
        Args: { p_id: string }
        Returns: undefined
      }
      fn_set_default_payment_method_unchecked: {
        Args: { p_id: string }
        Returns: undefined
      }
      fn_set_my_avatar_url: { Args: { p_url: string }; Returns: undefined }
      fn_set_my_locale: { Args: { p_locale: string }; Returns: undefined }
      fn_start_device_session: {
        Args: { p_device_id: string }
        Returns: {
          device_id: string
          ended_at: string | null
          id: string
          started_at: string | null
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "device_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_store_push_subscription: {
        Args: {
          p_auth: string
          p_endpoint: string
          p_p256dh: string
          p_user_agent?: string
        }
        Returns: undefined
      }
      fn_tapband_activate_credential: {
        Args: {
          p_actor_id: string
          p_attempt_id?: string
          p_credential_id: string
          p_device_id?: string
          p_session_id?: string
          p_verification_metadata?: Json
        }
        Returns: Json
      }
      fn_tapband_actor_can_manage_event: {
        Args: { p_actor_id: string; p_event_id: string }
        Returns: boolean
      }
      fn_tapband_actor_is_platform_admin: {
        Args: { p_actor_id: string }
        Returns: boolean
      }
      fn_tapband_assign_entitlement: {
        Args: {
          p_actor_id: string
          p_assignment_source?: string
          p_attempt_id?: string
          p_credential_id: string
          p_event_id: string
          p_metadata?: Json
          p_order_item_id: string
        }
        Returns: Json
      }
      fn_tapband_audit_lifecycle: {
        Args: {
          p_action: string
          p_actor_id: string
          p_changes: Json
          p_org_id: string
          p_record_id: string
          p_table_name: string
        }
        Returns: undefined
      }
      fn_tapband_customer_credentials: {
        Args: { p_user_id: string }
        Returns: Json
      }
      fn_tapband_issue_credential: {
        Args: {
          p_actor_id: string
          p_attempt_id?: string
          p_credential_public_id: string
          p_device_id?: string
          p_inventory_id: string
          p_metadata?: Json
          p_session_id?: string
          p_user_id: string
        }
        Returns: Json
      }
      fn_tapband_replace_credential: {
        Args: {
          p_actor_id: string
          p_attempt_id?: string
          p_metadata?: Json
          p_new_credential_public_id: string
          p_new_inventory_id: string
          p_old_credential_id: string
        }
        Returns: Json
      }
      fn_tapband_resolve_credential_for_event: {
        Args: {
          p_actor_id: string
          p_attempt_id?: string
          p_credential_public_id: string
          p_device_id?: string
          p_event_id: string
          p_gate?: string
          p_scanned_at?: string
          p_session_id?: string
        }
        Returns: Json
      }
      fn_tapband_revoke_credential: {
        Args: {
          p_actor_id: string
          p_attempt_id?: string
          p_credential_id: string
          p_metadata?: Json
          p_new_status?: string
          p_reason: string
        }
        Returns: Json
      }
      fn_ticket_is_transferable: {
        Args: { p_order_item_id: string }
        Returns: boolean
      }
      fn_ticket_type_remaining: {
        Args: { p_event_id: string }
        Returns: {
          remaining: number
          ticket_type_id: string
        }[]
      }
      fn_toggle_favourite: {
        Args: { p_event_id: string; p_save: boolean }
        Returns: Json
      }
      fn_toggle_notification_mute: { Args: { p_type: string }; Returns: Json }
      fn_transition_event_status: {
        Args: { p_event_id: string; p_new_status: string }
        Returns: Json
      }
      fn_transition_event_status_unchecked: {
        Args: { p_event_id: string; p_new_status: string }
        Returns: Json
      }
      fn_transition_payout: {
        Args: {
          p_destination_ref?: string
          p_new_status: Database["public"]["Enums"]["payout_status"]
          p_payout_id: string
        }
        Returns: {
          amount_cents: number
          created_at: string | null
          currency: string
          destination_ref: string | null
          id: string
          org_id: string
          paid_at: string | null
          provider: string
          status: Database["public"]["Enums"]["payout_status"]
        }
        SetofOptions: {
          from: "*"
          to: "payouts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_transition_refund: {
        Args: {
          p_new_status: Database["public"]["Enums"]["refund_status"]
          p_provider_payload?: Json
          p_provider_ref?: string
          p_refund_id: string
        }
        Returns: {
          amount_cents: number
          created_at: string | null
          currency: string
          id: string
          initiated_by: string | null
          payment_id: string
          processed_at: string | null
          provider_payload: Json | null
          provider_ref: string | null
          status: Database["public"]["Enums"]["refund_status"]
          type: Database["public"]["Enums"]["refund_type"]
        }
        SetofOptions: {
          from: "*"
          to: "refunds"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_update_my_notification_preferences: {
        Args: {
          p_email_opt_in?: boolean
          p_in_app_opt_in?: boolean
          p_push_opt_in?: boolean
          p_sms_opt_in?: boolean
        }
        Returns: undefined
      }
      fn_update_my_profile: {
        Args: {
          p_display_name?: string
          p_name?: string
          p_phone?: string
          p_surname?: string
        }
        Returns: undefined
      }
      fn_update_my_profile_unchecked: {
        Args: {
          p_display_name?: string
          p_name?: string
          p_phone?: string
          p_surname?: string
        }
        Returns: undefined
      }
      get_event_kpis: { Args: { p_event_id: string }; Returns: Json }
      get_event_kpis_unchecked: { Args: { p_event_id: string }; Returns: Json }
      get_organizer_kpis: { Args: { p_range?: string }; Returns: Json }
      get_organizer_kpis_unchecked: {
        Args: { p_range?: string }
        Returns: Json
      }
      get_ticket_type_event: {
        Args: { ticket_type_uuid: string }
        Returns: string
      }
      get_user_org: { Args: never; Returns: string }
      get_user_orgs:
        | {
            Args: never
            Returns: {
              org_id: string
            }[]
          }
        | {
            Args: { p_user_id: string }
            Returns: {
              org_id: string
            }[]
          }
      has_app_role: { Args: { r: string }; Returns: boolean }
      insert_job_secure: {
        Args: { p_kind: string; p_payload: Json; p_run_after?: string }
        Returns: string
      }
      is_event_organizer: {
        Args: { p_event_id: string; p_user_id: string }
        Returns: boolean
      }
      is_org_admin: { Args: { p_org_id: string }; Returns: boolean }
      is_org_finance_viewer: { Args: { p_org_id: string }; Returns: boolean }
      is_org_staff: {
        Args: { org_uuid: string; user_uuid: string }
        Returns: boolean
      }
      is_super_admin: { Args: { check_user_id?: string }; Returns: boolean }
      issue_comp_ticket: {
        Args: {
          p_note?: string
          p_org_id: string
          p_qty?: number
          p_recipient_email: string
          p_ticket_type_id: string
        }
        Returns: string
      }
      issue_comp_ticket_unchecked: {
        Args: {
          p_note?: string
          p_org_id: string
          p_qty?: number
          p_recipient_email: string
          p_ticket_type_id: string
        }
        Returns: string
      }
      order_ledger_summary_fn: {
        Args: never
        Returns: {
          gross_cents: number
          net_cents: number
          order_id: string
          payment_net_cents: number
          refund_cents: number
        }[]
      }
      order_ledger_summary_fn_definer: {
        Args: never
        Returns: {
          gross_cents: number
          net_cents: number
          order_id: string
          payment_net_cents: number
          refund_cents: number
        }[]
      }
      order_ledger_summary_fn_impl: {
        Args: never
        Returns: {
          gross_cents: number
          net_cents: number
          order_id: string
          payment_net_cents: number
          refund_cents: number
        }[]
      }
      order_ledger_summary_for_order: {
        Args: { p_order_id: string }
        Returns: {
          gross_cents: number
          net_cents: number
          order_id: string
          payment_net_cents: number
          refund_cents: number
        }[]
      }
      run_analyze: { Args: { schemas?: string[] }; Returns: undefined }
      scanner_mark_checkin: {
        Args: { p_order_item_id: string }
        Returns: undefined
      }
      slugify_text: { Args: { p_value: string }; Returns: string }
      user_has_org_role: {
        Args: { p_org: string; p_roles: string[] }
        Returns: boolean
      }
      verify_ticket_signature: {
        Args: { provided_sig: string; secret: string; ticket_code: string }
        Returns: boolean
      }
    }
    Enums: {
      admin_role_tier:
        | "super_admin"
        | "finance_admin"
        | "support_admin"
        | "event_ops_admin"
        | "read_only_admin"
      app_role:
        | "admin"
        | "organizer"
        | "venue"
        | "artist"
        | "attendee"
        | "scanner"
        | "pos"
        | "organizer_owner"
        | "organizer_admin"
        | "organizer_staff"
        | "finance"
        | "organizer_scanner"
        | "device"
      audit_action:
        | "insert"
        | "update"
        | "delete"
        | "login"
        | "logout"
        | "other"
      connection_status: "pending" | "accepted" | "declined" | "blocked"
      device_role:
        | "organizer_pos"
        | "organizer_scanner"
        | "organizer_kiosk"
        | "scanner_unassigned"
      event_format: "single_day" | "multi_day"
      event_status: "draft" | "published" | "archived" | "paused"
      fee_payer: "buyer" | "organizer"
      order_item_status:
        | "pending"
        | "issued"
        | "transferred"
        | "checked_in"
        | "revoked"
        | "refunded"
      order_status: "pending" | "paid" | "failed" | "refunded"
      payment_status:
        | "pending"
        | "authorized"
        | "succeeded"
        | "failed"
        | "refunded"
        | "partially_refunded"
        | "chargeback"
        | "void"
      payments_status: "succeeded" | "failed" | "pending" | "refunded"
      payout_status:
        | "requested"
        | "processing"
        | "paid"
        | "failed"
        | "cancelled"
      price_rule_type:
        | "absolute_discount"
        | "percent_discount"
        | "abs_fee"
        | "percent_fee"
        | "tax"
      refund_status:
        | "requested"
        | "processing"
        | "processed"
        | "failed"
        | "cancelled"
      refund_type: "full" | "partial"
      sales_channel: "online" | "pos" | "reseller" | "import" | "comp"
      seat_hold_status: "active" | "released" | "expired"
      series_type: "tour" | "recurring" | "season"
      ticket_type_sales_status: "on_sale" | "paused" | "sold_out" | "hidden"
      transfer_status:
        | "requested"
        | "pending"
        | "accepted"
        | "declined"
        | "cancelled"
        | "completed"
    }
    CompositeTypes: {
      order_totals: {
        order_id: string | null
        currency: string | null
        item_count: number | null
        subtotal_cents: number | null
        platform_fee_cents: number | null
        processor_fee_cents: number | null
        total_cents: number | null
        totals_computed_at: string | null
      }
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
      admin_role_tier: [
        "super_admin",
        "finance_admin",
        "support_admin",
        "event_ops_admin",
        "read_only_admin",
      ],
      app_role: [
        "admin",
        "organizer",
        "venue",
        "artist",
        "attendee",
        "scanner",
        "pos",
        "organizer_owner",
        "organizer_admin",
        "organizer_staff",
        "finance",
        "organizer_scanner",
        "device",
      ],
      audit_action: ["insert", "update", "delete", "login", "logout", "other"],
      connection_status: ["pending", "accepted", "declined", "blocked"],
      device_role: [
        "organizer_pos",
        "organizer_scanner",
        "organizer_kiosk",
        "scanner_unassigned",
      ],
      event_format: ["single_day", "multi_day"],
      event_status: ["draft", "published", "archived", "paused"],
      fee_payer: ["buyer", "organizer"],
      order_item_status: [
        "pending",
        "issued",
        "transferred",
        "checked_in",
        "revoked",
        "refunded",
      ],
      order_status: ["pending", "paid", "failed", "refunded"],
      payment_status: [
        "pending",
        "authorized",
        "succeeded",
        "failed",
        "refunded",
        "partially_refunded",
        "chargeback",
        "void",
      ],
      payments_status: ["succeeded", "failed", "pending", "refunded"],
      payout_status: ["requested", "processing", "paid", "failed", "cancelled"],
      price_rule_type: [
        "absolute_discount",
        "percent_discount",
        "abs_fee",
        "percent_fee",
        "tax",
      ],
      refund_status: [
        "requested",
        "processing",
        "processed",
        "failed",
        "cancelled",
      ],
      refund_type: ["full", "partial"],
      sales_channel: ["online", "pos", "reseller", "import", "comp"],
      seat_hold_status: ["active", "released", "expired"],
      series_type: ["tour", "recurring", "season"],
      ticket_type_sales_status: ["on_sale", "paused", "sold_out", "hidden"],
      transfer_status: [
        "requested",
        "pending",
        "accepted",
        "declined",
        "cancelled",
        "completed",
      ],
    },
  },
} as const
