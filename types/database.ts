export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      addons: {
        Row: {
          is_active: boolean
          key: string
          label: string
          price: number
          sort: number
        }
        Insert: {
          is_active?: boolean
          key: string
          label: string
          price: number
          sort?: number
        }
        Update: {
          is_active?: boolean
          key?: string
          label?: string
          price?: number
          sort?: number
        }
        Relationships: []
      }
      open_dates: {
        Row: {
          created_at: string
          date: string
          note: string | null
        }
        Insert: {
          created_at?: string
          date: string
          note?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          note?: string | null
        }
        Relationships: []
      }
      closed_dates: {
        Row: {
          created_at: string
          date: string
          note: string | null
        }
        Insert: {
          created_at?: string
          date: string
          note?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          note?: string | null
        }
        Relationships: []
      }
      admins: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          amount: number
          booking_number: string
          created_at: string
          facility_snapshot: Json
          guest_count: number
          guest_name: string
          guest_phone: string
          id: string
          slot_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          booking_number: string
          created_at?: string
          facility_snapshot: Json
          guest_count?: number
          guest_name: string
          guest_phone: string
          id?: string
          slot_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_number?: string
          created_at?: string
          facility_snapshot?: Json
          guest_count?: number
          guest_name?: string
          guest_phone?: string
          id?: string
          slot_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "slots"
            referencedColumns: ["id"]
          },
        ]
      }
      facilities: {
        Row: {
          capacity: number
          created_at: string
          id: string
          is_active: boolean
          name: string
          price_beef: number
          price_pork: number
          total_units: number
          type: string
          weather_dependent: boolean
        }
        Insert: {
          capacity?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          price_beef?: number
          price_pork?: number
          total_units: number
          type: string
          weather_dependent?: boolean
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          price_beef?: number
          price_pork?: number
          total_units?: number
          type?: string
          weather_dependent?: boolean
        }
        Relationships: []
      }
      facility_units: {
        Row: {
          facility_id: string
          id: string
          is_active: boolean
          unit_label: string
        }
        Insert: {
          facility_id: string
          id?: string
          is_active?: boolean
          unit_label: string
        }
        Update: {
          facility_id?: string
          id?: string
          is_active?: boolean
          unit_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_units_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          booking_id: string
          channel: string
          created_at: string
          id: string
          payload: Json | null
          recipient: string
          sent_at: string | null
          status: string
          type: string
        }
        Insert: {
          booking_id: string
          channel?: string
          created_at?: string
          id?: string
          payload?: Json | null
          recipient?: string
          sent_at?: string | null
          status?: string
          type: string
        }
        Update: {
          booking_id?: string
          channel?: string
          created_at?: string
          id?: string
          payload?: Json | null
          recipient?: string
          sent_at?: string | null
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          approved_at: string | null
          booking_id: string
          cancelled_at: string | null
          created_at: string
          id: string
          method: string | null
          raw_response: Json | null
          status: string
          toss_order_id: string
          toss_payment_key: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          booking_id: string
          cancelled_at?: string | null
          created_at?: string
          id?: string
          method?: string | null
          raw_response?: Json | null
          status?: string
          toss_order_id: string
          toss_payment_key?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          booking_id?: string
          cancelled_at?: string | null
          created_at?: string
          id?: string
          method?: string | null
          raw_response?: Json | null
          status?: string
          toss_order_id?: string
          toss_payment_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      slots: {
        Row: {
          created_at: string
          date: string
          facility_unit_id: string
          id: string
          part: number
          status: string
        }
        Insert: {
          created_at?: string
          date: string
          facility_unit_id: string
          id?: string
          part: number
          status?: string
        }
        Update: {
          created_at?: string
          date?: string
          facility_unit_id?: string
          id?: string
          part?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "slots_facility_unit_id_fkey"
            columns: ["facility_unit_id"]
            isOneToOne: false
            referencedRelation: "facility_units"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      confirm_booking_tx: {
        Args: {
          p_amount: number
          p_approved_at: string
          p_method: string
          p_order_id: string
          p_payment_key: string
          p_raw: Json
        }
        Returns: {
          booking_id: string
          booking_number: string
          outcome: string
        }[]
      }
      expire_pending_bookings: { Args: { p_timeout?: string }; Returns: number }
      finalize_refund_tx: {
        Args: {
          p_booking_id: string
          p_did_toss_cancel: boolean
          p_is_partial: boolean
          p_raw: Json
          p_refund_amount: number
        }
        Returns: {
          booking_id: string
          refunded_amount: number
        }[]
      }
      generate_slots: {
        Args: { p_from: string; p_to: string }
        Returns: number
      }
      is_admin: { Args: never; Returns: boolean }
      pending_payment_timeout: { Args: never; Returns: string }
      request_cancel_tx: {
        Args: { p_order_id: string }
        Returns: {
          booking_id: string
          outcome: string
          paid_amount: number
          payment_key: string
          slot_date: string
        }[]
      }
      reserve_slot: {
        Args: {
          p_addons?: Json
          p_guest_count: number
          p_guest_name: string
          p_guest_phone: string
          p_meat: string
          p_slot_id: string
        }
        Returns: {
          amount: number
          booking_id: string
          booking_number: string
          order_id: string
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

