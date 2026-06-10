// Auto-generated base + manual extensions for multi-tenant schema.
// Regenerate with: npx supabase gen types typescript --project-id <id> > types/database.ts

export type Json =
  | string | number | boolean | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole         = "superadmin" | "owner" | "brand";
export type PaymentMethod    = "cash" | "pos" | "transfer" | "mixed";
export type SettlementStatus = "pending" | "paid";
export type SettlementModel  = "commission" | "space_fee" | "both" | "none";
export type SettlementPeriod = "quincenal" | "mensual";
export type CurrencyCode     = "NIO" | "USD";
export type BrandPaymentType = "payout" | "fee_charge" | "fee_payment";

export type Database = {
  public: {
    Tables: {
      // ── organizations ──────────────────────────────────────
      organizations: {
        Row: {
          id:                 string;
          name:               string;
          slug:               string;
          currency:           CurrencyCode;
          settlement_model:   SettlementModel;
          settlement_period:  SettlementPeriod;
          exchange_rate:      number;
          active:             boolean;
          created_at:         string;
        };
        Insert: {
          id?:                string;
          name:               string;
          slug:               string;
          currency?:          CurrencyCode;
          settlement_model?:  SettlementModel;
          settlement_period?: SettlementPeriod;
          exchange_rate?:     number;
          active?:            boolean;
          created_at?:        string;
        };
        Update: {
          id?:                string;
          name?:              string;
          slug?:              string;
          currency?:          CurrencyCode;
          settlement_model?:  SettlementModel;
          settlement_period?: SettlementPeriod;
          exchange_rate?:     number;
          active?:            boolean;
          created_at?:        string;
        };
        Relationships: [];
      };
      // ── profiles ────────────────────────────────────────────
      profiles: {
        Row: {
          id:              string;
          role:            UserRole;
          brand_id:        string | null;
          organization_id: string | null;    // null solo para superadmin
          full_name:       string | null;
          created_at:      string;
        };
        Insert: {
          id:               string;
          role?:            UserRole;
          brand_id?:        string | null;
          organization_id?: string | null;
          full_name?:       string | null;
          created_at?:      string;
        };
        Update: {
          id?:              string;
          role?:            UserRole;
          brand_id?:        string | null;
          organization_id?: string | null;
          full_name?:       string | null;
          created_at?:      string;
        };
        Relationships: [
          { foreignKeyName: "profiles_brand_id_fkey"; columns: ["brand_id"]; isOneToOne: false; referencedRelation: "brands"; referencedColumns: ["id"] },
          { foreignKeyName: "profiles_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
        ];
      };
      // ── brands ──────────────────────────────────────────────
      brands: {
        Row: {
          id:              string;
          organization_id: string;
          name:            string;
          contact_name:    string | null;
          phone:           string | null;
          email:           string | null;
          space_fee:       number;
          commission_rate: number;
          active:          boolean;
          created_at:      string;
        };
        Insert: {
          id?:              string;
          organization_id:  string;
          name:             string;
          contact_name?:    string | null;
          phone?:           string | null;
          email?:           string | null;
          space_fee?:       number;
          commission_rate?: number;
          active?:          boolean;
          created_at?:      string;
        };
        Update: {
          id?:              string;
          organization_id?: string;
          name?:            string;
          contact_name?:    string | null;
          phone?:           string | null;
          email?:           string | null;
          space_fee?:       number;
          commission_rate?: number;
          active?:          boolean;
          created_at?:      string;
        };
        Relationships: [
          { foreignKeyName: "brands_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
        ];
      };
      // ── products ────────────────────────────────────────────
      products: {
        Row: {
          id:                  string;
          organization_id:     string;
          brand_id:            string;
          code:                string;
          name:                string;
          description:         string | null;
          price:               number;
          cost:                number | null;
          stock_quantity:      number;
          low_stock_threshold: number;
          image_url:           string | null;
          active:              boolean;
          created_at:          string;
          updated_at:          string;
        };
        Insert: {
          id?:                  string;
          organization_id:      string;
          brand_id:             string;
          code:                 string;
          name:                 string;
          description?:         string | null;
          price?:               number;
          cost?:                number | null;
          stock_quantity?:      number;
          low_stock_threshold?: number;
          image_url?:           string | null;
          active?:              boolean;
          created_at?:          string;
          updated_at?:          string;
        };
        Update: {
          id?:                  string;
          organization_id?:     string;
          brand_id?:            string;
          code?:                string;
          name?:                string;
          description?:         string | null;
          price?:               number;
          cost?:                number | null;
          stock_quantity?:      number;
          low_stock_threshold?: number;
          image_url?:           string | null;
          active?:              boolean;
          created_at?:          string;
          updated_at?:          string;
        };
        Relationships: [
          { foreignKeyName: "products_brand_id_fkey"; columns: ["brand_id"]; isOneToOne: false; referencedRelation: "brands"; referencedColumns: ["id"] },
          { foreignKeyName: "products_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
        ];
      };
      // ── customers ───────────────────────────────────────────
      customers: {
        Row: {
          id:              string;
          organization_id: string;
          name:            string;
          phone:           string | null;
          email:           string | null;
          notes:           string | null;
          created_at:      string;
        };
        Insert: {
          id?:              string;
          organization_id:  string;
          name:             string;
          phone?:           string | null;
          email?:           string | null;
          notes?:           string | null;
          created_at?:      string;
        };
        Update: {
          id?:              string;
          organization_id?: string;
          name?:            string;
          phone?:           string | null;
          email?:           string | null;
          notes?:           string | null;
          created_at?:      string;
        };
        Relationships: [
          { foreignKeyName: "customers_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
        ];
      };
      // ── sales ────────────────────────────────────────────────
      sales: {
        Row: {
          id:              string;
          organization_id: string;
          sale_number:     number;
          customer_id:     string | null;
          subtotal:        number;
          discount_total:  number;
          total:           number;
          payment_method:  PaymentMethod;
          sold_by:         string | null;
          created_at:      string;
          cancelled:       boolean;
          cancelled_at:    string | null;
        };
        Insert: {
          id?:              string;
          organization_id:  string;
          sale_number?:     number;
          customer_id?:     string | null;
          subtotal?:        number;
          discount_total?:  number;
          total?:           number;
          payment_method?:  PaymentMethod;
          sold_by?:         string | null;
          created_at?:      string;
          cancelled?:       boolean;
          cancelled_at?:    string | null;
        };
        Update: {
          id?:              string;
          organization_id?: string;
          sale_number?:     number;
          customer_id?:     string | null;
          subtotal?:        number;
          discount_total?:  number;
          total?:           number;
          payment_method?:  PaymentMethod;
          sold_by?:         string | null;
          created_at?:      string;
          cancelled?:       boolean;
          cancelled_at?:    string | null;
        };
        Relationships: [
          { foreignKeyName: "sales_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
          { foreignKeyName: "sales_customer_id_fkey"; columns: ["customer_id"]; isOneToOne: false; referencedRelation: "customers"; referencedColumns: ["id"] },
          { foreignKeyName: "sales_sold_by_fkey"; columns: ["sold_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      // ── sale_items ──────────────────────────────────────────
      sale_items: {
        Row: {
          id:              string;
          organization_id: string;
          sale_id:         string;
          product_id:      string;
          brand_id:        string;
          quantity:        number;
          unit_price:      number;
          discount:        number;
          line_total:      number;
        };
        Insert: {
          id?:              string;
          organization_id:  string;
          sale_id:          string;
          product_id:       string;
          brand_id:         string;
          quantity:         number;
          unit_price:       number;
          discount?:        number;
          line_total:       number;
        };
        Update: {
          id?:              string;
          organization_id?: string;
          sale_id?:         string;
          product_id?:      string;
          brand_id?:        string;
          quantity?:        number;
          unit_price?:      number;
          discount?:        number;
          line_total?:      number;
        };
        Relationships: [
          { foreignKeyName: "sale_items_sale_id_fkey"; columns: ["sale_id"]; isOneToOne: false; referencedRelation: "sales"; referencedColumns: ["id"] },
          { foreignKeyName: "sale_items_product_id_fkey"; columns: ["product_id"]; isOneToOne: false; referencedRelation: "products"; referencedColumns: ["id"] },
          { foreignKeyName: "sale_items_brand_id_fkey"; columns: ["brand_id"]; isOneToOne: false; referencedRelation: "brands"; referencedColumns: ["id"] },
          { foreignKeyName: "sale_items_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
        ];
      };
      // ── settlements ─────────────────────────────────────────
      settlements: {
        Row: {
          id:                string;
          organization_id:   string;
          brand_id:          string;
          period_start:      string;
          period_end:        string;
          gross_sales:       number;
          commission_amount: number;
          net_payout:        number;
          status:            SettlementStatus;
          created_at:        string;
          paid_at:           string | null;
        };
        Insert: {
          id?:                string;
          organization_id:    string;
          brand_id:           string;
          period_start:       string;
          period_end:         string;
          gross_sales?:       number;
          commission_amount?: number;
          net_payout?:        number;
          status?:            SettlementStatus;
          created_at?:        string;
          paid_at?:           string | null;
        };
        Update: {
          id?:                string;
          organization_id?:   string;
          brand_id?:          string;
          period_start?:      string;
          period_end?:        string;
          gross_sales?:       number;
          commission_amount?: number;
          net_payout?:        number;
          status?:            SettlementStatus;
          created_at?:        string;
          paid_at?:           string | null;
        };
        Relationships: [
          { foreignKeyName: "settlements_brand_id_fkey"; columns: ["brand_id"]; isOneToOne: false; referencedRelation: "brands"; referencedColumns: ["id"] },
          { foreignKeyName: "settlements_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
        ];
      };
      // ── cash_closures ───────────────────────────────────────
      cash_closures: {
        Row: {
          id:                string;
          organization_id:   string;
          closure_date:      string;
          expected_cash:     number;
          counted_cash:      number;
          expected_pos:      number;
          expected_transfer: number;
          expected_mixed:    number;
          difference:        number;
          notes:             string | null;
          closed_by:         string | null;
          created_at:        string;
        };
        Insert: {
          id?:                string;
          organization_id:    string;
          closure_date:       string;
          expected_cash?:     number;
          counted_cash?:      number;
          expected_pos?:      number;
          expected_transfer?: number;
          expected_mixed?:    number;
          difference?:        number;
          notes?:             string | null;
          closed_by?:         string | null;
          created_at?:        string;
        };
        Update: {
          id?:                string;
          organization_id?:   string;
          closure_date?:      string;
          expected_cash?:     number;
          counted_cash?:      number;
          expected_pos?:      number;
          expected_transfer?: number;
          expected_mixed?:    number;
          difference?:        number;
          notes?:             string | null;
          closed_by?:         string | null;
          created_at?:        string;
        };
        Relationships: [
          { foreignKeyName: "cash_closures_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
          { foreignKeyName: "cash_closures_closed_by_fkey"; columns: ["closed_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      // ── brand_payments ──────────────────────────────────────
      brand_payments: {
        Row: {
          id:              string;
          organization_id: string;
          brand_id:        string;
          settlement_id:   string | null;
          amount:          number;
          type:            BrandPaymentType;
          method:          PaymentMethod | null;
          occurred_on:     string;
          notes:           string | null;
          created_at:      string;
        };
        Insert: {
          id?:              string;
          organization_id:  string;
          brand_id:         string;
          settlement_id?:   string | null;
          amount:           number;
          type:             BrandPaymentType;
          method?:          PaymentMethod | null;
          occurred_on?:     string;
          notes?:           string | null;
          created_at?:      string;
        };
        Update: {
          id?:              string;
          organization_id?: string;
          brand_id?:        string;
          settlement_id?:   string | null;
          amount?:          number;
          type?:            BrandPaymentType;
          method?:          PaymentMethod | null;
          occurred_on?:     string;
          notes?:           string | null;
          created_at?:      string;
        };
        Relationships: [
          { foreignKeyName: "brand_payments_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
          { foreignKeyName: "brand_payments_brand_id_fkey"; columns: ["brand_id"]; isOneToOne: false; referencedRelation: "brands"; referencedColumns: ["id"] },
          { foreignKeyName: "brand_payments_settlement_id_fkey"; columns: ["settlement_id"]; isOneToOne: false; referencedRelation: "settlements"; referencedColumns: ["id"] },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      cancel_sale:             { Args: { p_sale_id: string }; Returns: void };
      current_org_id:          { Args: Record<string, never>; Returns: string | null };
      current_role_is_owner:   { Args: Record<string, never>; Returns: boolean };
      current_brand_id:        { Args: Record<string, never>; Returns: string | null };
      is_superadmin:           { Args: Record<string, never>; Returns: boolean };
      register_sale: {
        Args: {
          p_customer_id:     string | null;
          p_payment_method:  PaymentMethod;
          p_sold_by:         string;
          p_items:           Json;
          p_organization_id?: string | null;
        };
        Returns: string;
      };
    };
    Enums: {
      user_role:         UserRole;
      payment_method:    PaymentMethod;
      settlement_status: SettlementStatus;
      settlement_model:  SettlementModel;
      currency_code:     CurrencyCode;
    };
    CompositeTypes: Record<string, never>;
  };
};
