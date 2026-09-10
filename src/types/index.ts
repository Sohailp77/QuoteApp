// Central TypeScript types for the Quote App

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'boss' | 'employee';
  tenant_id: string;
  status?: string;
}

export interface Customer {
  id: string;
  tenant_id: string;
  name: string;
  phone: string;
  email: string;
  billing_address: string;
  gst_number: string;
  notes?: string;
  created_at: string;
}

export interface Employee {
  id: string;
  user_id?: string;
  tenant_id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  department: string;
  status: string;
  joined_date?: string;
}

export interface Category {
  id: string;
  tenant_id: string;
  name: string;
  is_active: boolean;
  unit_name?: string | null;
  metric_type?: 'fixed' | 'measured';
  description?: string;
  calc_type?: 'pcs' | 'size' | 'area' | 'length' | 'weight';
  image_url?: string;
}

export interface TaxRate {
  id: string;
  tenant_id: string;
  name: string;
  percentage: number;
  is_default: boolean;
  is_active: boolean;
}

export type CalcMethod = 'direct' | 'area' | 'length' | 'weight' | 'volume' | 'custom';
export type RoundingMode = 'round_up' | 'allow_decimals' | 'round_nearest' | 'round_down';

export interface Product {
  id: string;
  tenant_id?: string;
  user_id: string;
  name: string;
  description: string;
  unit_price: number;
  cost_price?: number;
  stock_quantity?: number;
  reorder_level?: number;
  unit: string; // Selling/Inventory unit (e.g. BOX, PCS, ROLL, BAG, LITER)
  category: string;
  vendor_id?: string;
  sku: string;
  barcode?: string;
  warehouse_location?: string;
  created_at: string;
  calc_type?: string; // Database raw calc_type representation
  calc_method?: CalcMethod;
  input_unit?: string; // Input requirement unit (e.g. SQFT, METER, KG)
  unit_coverage?: number; // Coverage per selling unit (e.g. 1 BOX = 15 SQFT)
  rounding_mode?: RoundingMode;
  image_url?: string;
}

export interface StockMovement {
  id: string;
  tenant_id: string;
  product_id: string;
  product_name: string;
  movement_type: 'IN' | 'OUT' | 'RETURN' | 'DAMAGE' | 'ADJUSTMENT';
  quantity: number;
  note?: string;
  supplier?: string;
  created_at: string;
}

export type ReorderStatus = 'Draft' | 'Ordered' | 'Partially Received' | 'Received';

export interface ReorderItem {
  product_id: string;
  product_name: string;
  sku: string;
  unit: string;
  vendor: string;
  reorder_quantity: number;
  received_quantity: number;
}

export interface Reorder {
  id: string;
  tenant_id: string;
  order_number: string;
  vendor_name: string;
  status: ReorderStatus;
  items: ReorderItem[];
  total_paid: number;
  total_estimated_cost?: number;
  invoice_number?: string;
  purchase_date?: string;
  notes?: string;
  created_at: string;
}

export interface CompanySettings {
  id: string;
  tenant_id: string;
  company_name: string;
  email?: string;
  phone?: string;
  website?: string;
  gst_number?: string;
  address?: string;
  currency: string;
  date_format: string;
  invoice_prefix: string;
  next_invoice_number: number;
  default_notes?: string;
  terms_conditions?: string;
  logo_url?: string;
  bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
}

export type QuoteStatus = 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired';

export interface QuoteItem {
  id?: string;
  quote_id?: string;
  product_id?: string;
  product_name: string;
  unit_price: number; // Price per selling unit
  quantity: number; // Final selling quantity used for line total and stock deduction
  discount: number; // percentage
  line_total: number;
  
  // Extended calculation fields
  calc_method?: CalcMethod;
  calc_mode?: string; // Legacy fallback
  input_qty?: number; // Requirement value (e.g. 100 SQFT)
  input_unit?: string; // Requirement unit (e.g. SQFT, METER, KG)
  selling_unit?: string; // Selling unit (e.g. BOX, ROLL, BAG)
  unit_coverage?: number; // Coverage ratio (e.g. 15 SQFT / BOX)
  calculated_qty?: number; // Raw exact calculated decimal quantity (e.g. 6.67)
  rounding_mode?: RoundingMode;
  formula_text?: string; // Detailed human-readable calculation summary
  pcs?: number;
  length?: number;
  width?: number;
  area?: number;
}

export type LineItem = QuoteItem;

export interface Quote {
  id: string;
  tenant_id: string;
  user_id: string;
  quote_number: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  customer_id?: string;
  status: QuoteStatus;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes?: string;
  valid_until: string;
  created_at: string;
  items?: QuoteItem[];
  payment_status?: 'Pending' | 'Partial' | 'Paid';
  payment_method?: string;
  delivery_date?: string;
  delivery_partner?: string;
  tracking_number?: string;
  delivery_status?: 'Pending' | 'Shipped' | 'Delivered';
  delivery_note?: string;
}

export interface Vendor {
  id: string;
  tenant_id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  gst_number?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
}

export type DirectSaleStatus = 'Paid' | 'Partial' | 'Pending';

export interface DirectSaleItem {
  id?: string;
  product_id?: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  discount: number;
  line_total: number;
  unit?: string;
}

export interface DirectSale {
  id: string;
  tenant_id: string;
  sale_number: string;
  customer_name: string;
  customer_phone?: string;
  user_id?: string;
  created_by_name?: string;
  created_by_role?: string;
  items: DirectSaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payment_method: string;
  payment_status: DirectSaleStatus;
  notes?: string;
  created_at: string;
}

// Navigation types
export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Quotes: undefined;
  Employees: undefined;
  Products: undefined;
  Profile: undefined;
};

export type QuoteStackParamList = {
  QuotesList: undefined;
  QuoteDetail: { quoteId: string };
  CreateQuote?: { quoteId?: string };
};

export type EmployeeStackParamList = {
  EmployeesList: undefined;
  EmployeeForm: { employee?: Employee };
};

export type ProductStackParamList = {
  ProductsList: undefined;
  ProductForm: { product?: Product };
  StockManagement: undefined;
  ReorderStock: undefined;
};
