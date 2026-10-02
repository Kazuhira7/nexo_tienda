// Auto-generated base + manual extensions for multi-tenant schema.
// Regenerate with: npx supabase gen types typescript --project-id <id> > types/database.ts

export type Json =
  | string | number | boolean | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole         = "superadmin" | "owner" | "brand" | "terminal";
export type PaymentMethod    = "cash" | "pos" | "transfer" | "mixed";
export type SettlementStatus = "pending" | "paid";
export type SettlementModel  = "commission" | "space_fee" | "both" | "none";
export type SettlementPeriod = "quincenal" | "mensual";
export type CurrencyCode     = "NIO" | "USD";
export type BrandPaymentType = "payout" | "fee_charge" | "fee_payment";
export type VerticalType     = "colectivo" | "retail" | "restaurante";
export type ModuleId         = "pos" | "inventory" | "customers" | "cash" | "brands" | "settlements" | "restaurant" | "kitchen";
export type SaleSource       = "pos" | "restaurant";
export type TableStatus      = "free" | "occupied" | "bill_requested";
export type OrderStatus      = "open" | "paid" | "cancelled";
export type OrderType        = "dine_in" | "takeaway" | "delivery";
export type OrderItemStatus  = "pending" | "sent" | "preparing" | "ready" | "served" | "cancelled";
export type PrepStation      = "kitchen" | "bar";

/** Snapshot of a modifier stored in order_items.modifiers */
export interface OrderItemModifier {
  id:          string;
  name:        string;
  price_delta: number;
}

/** Result of staff_login (PIN). On failure only { ok: false, error }. */
export type StaffLoginResult =
  | { ok: true; token: string; staff_member_id: string; name: string; position: string; permissions: string[] }
  | { ok: false; error: string };

/** Result of current_staff (null when there is no valid PIN session). */
export interface CurrentStaff {
  staff_member_id: string;
  name:            string;
  position:        string;
  permissions:     string[];
}

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
          vertical:           VerticalType;
          enabled_modules:    ModuleId[];
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
          vertical?:          VerticalType;
          enabled_modules?:   ModuleId[];
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
          vertical?:          VerticalType;
          enabled_modules?:   ModuleId[];
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
          tip_amount:      number;
          source:          SaleSource;
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
          tip_amount?:      number;
          source?:          SaleSource;
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
          tip_amount?:      number;
          source?:          SaleSource;
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
      // ── staff_members (equipo con PIN; el hash vive en staff_pins, inaccesible) ──
      staff_members: {
        Row: {
          id:              string;
          organization_id: string;
          profile_id:      string | null;
          name:            string;
          position:        string;
          permissions:     string[];
          active:          boolean;
          created_at:      string;
        };
        Insert: {
          id?:              string;
          organization_id:  string;
          profile_id?:      string | null;
          name:             string;
          position?:        string;
          permissions?:     string[];
          active?:          boolean;
          created_at?:      string;
        };
        Update: {
          id?:              string;
          organization_id?: string;
          profile_id?:      string | null;
          name?:            string;
          position?:        string;
          permissions?:     string[];
          active?:          boolean;
          created_at?:      string;
        };
        Relationships: [
          { foreignKeyName: "staff_members_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
          { foreignKeyName: "staff_members_profile_id_fkey"; columns: ["profile_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      // ── dining_areas ────────────────────────────────────────
      dining_areas: {
        Row: {
          id:              string;
          organization_id: string;
          name:            string;
          sort_order:      number;
          created_at:      string;
        };
        Insert: {
          id?:              string;
          organization_id:  string;
          name:             string;
          sort_order?:      number;
          created_at?:      string;
        };
        Update: {
          id?:              string;
          organization_id?: string;
          name?:            string;
          sort_order?:      number;
          created_at?:      string;
        };
        Relationships: [
          { foreignKeyName: "dining_areas_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
        ];
      };
      // ── dining_tables ───────────────────────────────────────
      dining_tables: {
        Row: {
          id:              string;
          organization_id: string;
          area_id:         string | null;
          name:            string;
          seats:           number;
          status:          TableStatus;
          sort_order:      number;
          active:          boolean;
          created_at:      string;
        };
        Insert: {
          id?:              string;
          organization_id:  string;
          area_id?:         string | null;
          name:             string;
          seats?:           number;
          status?:          TableStatus;
          sort_order?:      number;
          active?:          boolean;
          created_at?:      string;
        };
        Update: {
          id?:              string;
          organization_id?: string;
          area_id?:         string | null;
          name?:            string;
          seats?:           number;
          status?:          TableStatus;
          sort_order?:      number;
          active?:          boolean;
          created_at?:      string;
        };
        Relationships: [
          { foreignKeyName: "dining_tables_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
          { foreignKeyName: "dining_tables_area_id_fkey"; columns: ["area_id"]; isOneToOne: false; referencedRelation: "dining_areas"; referencedColumns: ["id"] },
        ];
      };
      // ── menu_categories ─────────────────────────────────────
      menu_categories: {
        Row: {
          id:              string;
          organization_id: string;
          name:            string;
          sort_order:      number;
          active:          boolean;
        };
        Insert: {
          id?:              string;
          organization_id:  string;
          name:             string;
          sort_order?:      number;
          active?:          boolean;
        };
        Update: {
          id?:              string;
          organization_id?: string;
          name?:            string;
          sort_order?:      number;
          active?:          boolean;
        };
        Relationships: [
          { foreignKeyName: "menu_categories_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
        ];
      };
      // ── menu_items ──────────────────────────────────────────
      menu_items: {
        Row: {
          id:              string;
          organization_id: string;
          category_id:     string | null;
          name:            string;
          description:     string | null;
          price:           number;
          cost:            number | null;
          image_url:       string | null;
          prep_station:    PrepStation;
          available:       boolean;
          active:          boolean;
          sort_order:      number;
          created_at:      string;
        };
        Insert: {
          id?:              string;
          organization_id:  string;
          category_id?:     string | null;
          name:             string;
          description?:     string | null;
          price:            number;
          cost?:            number | null;
          image_url?:       string | null;
          prep_station?:    PrepStation;
          available?:       boolean;
          active?:          boolean;
          sort_order?:      number;
          created_at?:      string;
        };
        Update: {
          id?:              string;
          organization_id?: string;
          category_id?:     string | null;
          name?:            string;
          description?:     string | null;
          price?:           number;
          cost?:            number | null;
          image_url?:       string | null;
          prep_station?:    PrepStation;
          available?:       boolean;
          active?:          boolean;
          sort_order?:      number;
          created_at?:      string;
        };
        Relationships: [
          { foreignKeyName: "menu_items_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
          { foreignKeyName: "menu_items_category_id_fkey"; columns: ["category_id"]; isOneToOne: false; referencedRelation: "menu_categories"; referencedColumns: ["id"] },
        ];
      };
      // ── modifier_groups ─────────────────────────────────────
      modifier_groups: {
        Row: {
          id:              string;
          organization_id: string;
          name:            string;
          min_select:      number;
          max_select:      number;
        };
        Insert: {
          id?:              string;
          organization_id:  string;
          name:             string;
          min_select?:      number;
          max_select?:      number;
        };
        Update: {
          id?:              string;
          organization_id?: string;
          name?:            string;
          min_select?:      number;
          max_select?:      number;
        };
        Relationships: [
          { foreignKeyName: "modifier_groups_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
        ];
      };
      // ── modifiers ───────────────────────────────────────────
      modifiers: {
        Row: {
          id:              string;
          organization_id: string;
          group_id:        string;
          name:            string;
          price_delta:     number;
          sort_order:      number;
        };
        Insert: {
          id?:              string;
          organization_id:  string;
          group_id:         string;
          name:             string;
          price_delta?:     number;
          sort_order?:      number;
        };
        Update: {
          id?:              string;
          organization_id?: string;
          group_id?:        string;
          name?:            string;
          price_delta?:     number;
          sort_order?:      number;
        };
        Relationships: [
          { foreignKeyName: "modifiers_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
          { foreignKeyName: "modifiers_group_id_fkey"; columns: ["group_id"]; isOneToOne: false; referencedRelation: "modifier_groups"; referencedColumns: ["id"] },
        ];
      };
      // ── menu_item_modifier_groups ───────────────────────────
      menu_item_modifier_groups: {
        Row: {
          menu_item_id:    string;
          group_id:        string;
          organization_id: string;
          sort_order:      number;
        };
        Insert: {
          menu_item_id:     string;
          group_id:         string;
          organization_id:  string;
          sort_order?:      number;
        };
        Update: {
          menu_item_id?:    string;
          group_id?:        string;
          organization_id?: string;
          sort_order?:      number;
        };
        Relationships: [
          { foreignKeyName: "menu_item_modifier_groups_menu_item_id_fkey"; columns: ["menu_item_id"]; isOneToOne: false; referencedRelation: "menu_items"; referencedColumns: ["id"] },
          { foreignKeyName: "menu_item_modifier_groups_group_id_fkey"; columns: ["group_id"]; isOneToOne: false; referencedRelation: "modifier_groups"; referencedColumns: ["id"] },
          { foreignKeyName: "menu_item_modifier_groups_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
        ];
      };
      // ── orders (solo lectura desde el cliente; se escribe vía RPC) ──
      orders: {
        Row: {
          id:                 string;
          organization_id:    string;
          order_number:       number;
          table_id:           string | null;
          order_type:         OrderType;
          status:             OrderStatus;
          guests:             number;
          opened_by_staff:    string | null;
          closed_by_staff:    string | null;
          cancelled_by_staff: string | null;
          customer_id:        string | null;
          notes:              string | null;
          sale_id:            string | null;
          cancel_reason:      string | null;
          opened_at:          string;
          closed_at:          string | null;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [
          { foreignKeyName: "orders_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
          { foreignKeyName: "orders_table_id_fkey"; columns: ["table_id"]; isOneToOne: false; referencedRelation: "dining_tables"; referencedColumns: ["id"] },
          { foreignKeyName: "orders_opened_by_staff_fkey"; columns: ["opened_by_staff"]; isOneToOne: false; referencedRelation: "staff_members"; referencedColumns: ["id"] },
          { foreignKeyName: "orders_closed_by_staff_fkey"; columns: ["closed_by_staff"]; isOneToOne: false; referencedRelation: "staff_members"; referencedColumns: ["id"] },
          { foreignKeyName: "orders_cancelled_by_staff_fkey"; columns: ["cancelled_by_staff"]; isOneToOne: false; referencedRelation: "staff_members"; referencedColumns: ["id"] },
          { foreignKeyName: "orders_customer_id_fkey"; columns: ["customer_id"]; isOneToOne: false; referencedRelation: "customers"; referencedColumns: ["id"] },
          { foreignKeyName: "orders_sale_id_fkey"; columns: ["sale_id"]; isOneToOne: false; referencedRelation: "sales"; referencedColumns: ["id"] },
        ];
      };
      // ── order_items (solo lectura desde el cliente; se escribe vía RPC) ──
      order_items: {
        Row: {
          id:              string;
          organization_id: string;
          order_id:        string;
          menu_item_id:    string;
          item_name:       string;
          quantity:        number;
          unit_price:      number;
          modifiers:       OrderItemModifier[];
          modifiers_total: number;
          line_total:      number;
          notes:           string | null;
          status:          OrderItemStatus;
          voided_by_staff: string | null;
          created_at:      string;
          sent_at:         string | null;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [
          { foreignKeyName: "order_items_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
          { foreignKeyName: "order_items_order_id_fkey"; columns: ["order_id"]; isOneToOne: false; referencedRelation: "orders"; referencedColumns: ["id"] },
          { foreignKeyName: "order_items_menu_item_id_fkey"; columns: ["menu_item_id"]; isOneToOne: false; referencedRelation: "menu_items"; referencedColumns: ["id"] },
          { foreignKeyName: "order_items_voided_by_staff_fkey"; columns: ["voided_by_staff"]; isOneToOne: false; referencedRelation: "staff_members"; referencedColumns: ["id"] },
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
      current_user_is_team:    { Args: Record<string, never>; Returns: boolean };
      // ── Equipo con PIN ──
      staff_login:             { Args: { p_pin: string; p_one_shot?: boolean }; Returns: StaffLoginResult };
      current_staff:           { Args: { p_token: string }; Returns: CurrentStaff | null };
      staff_logout:            { Args: { p_token: string }; Returns: void };
      set_staff_pin:           { Args: { p_member_id: string; p_pin: string }; Returns: void };
      staff_members_with_pin:  { Args: Record<string, never>; Returns: string[] };
      // ── Restaurante (todas requieren sesión de PIN) ──
      open_order: {
        Args: { p_staff_token: string; p_table_id?: string | null; p_order_type?: OrderType; p_guests?: number };
        Returns: string;
      };
      add_order_item: {
        Args: {
          p_staff_token:   string;
          p_order_id:      string;
          p_menu_item_id:  string;
          p_quantity:      number;
          p_modifier_ids?: string[];
          p_notes?:        string | null;
        };
        Returns: string;
      };
      send_order_to_kitchen:   { Args: { p_staff_token: string; p_order_id: string }; Returns: number };
      set_order_item_status: {
        Args: { p_staff_token: string; p_item_id: string; p_status: OrderItemStatus };
        Returns: void;
      };
      request_bill:            { Args: { p_staff_token: string; p_order_id: string }; Returns: void };
      close_order: {
        Args: {
          p_staff_token:    string;
          p_order_id:       string;
          p_payment_method: PaymentMethod;
          p_discount?:      number;
          p_tip?:           number;
          p_customer_id?:   string | null;
        };
        Returns: string;
      };
      cancel_order:            { Args: { p_staff_token: string; p_order_id: string; p_reason: string }; Returns: void };
      set_menu_item_available: {
        Args: { p_staff_token: string; p_menu_item_id: string; p_available: boolean };
        Returns: void;
      };
    };
    Enums: {
      user_role:         UserRole;
      payment_method:    PaymentMethod;
      settlement_status: SettlementStatus;
      settlement_model:  SettlementModel;
      currency_code:     CurrencyCode;
      vertical_type:     VerticalType;
      table_status:      TableStatus;
      order_status:      OrderStatus;
      order_type:        OrderType;
      order_item_status: OrderItemStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
