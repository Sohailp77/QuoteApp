// Central TypeScript types for the Quote App

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'boss' | 'employee';
  tenant_id: string;
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
  unit: string;
  category: string;
  sku: string;
  barcode?: string;
  warehouse_location?: string;
  created_at: string;
  calc_type?: 'pcs' | 'size' | 'area' | 'length' | 'weight';
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
  id: string;
  quote_id?: string;
  product_id?: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  discount: number; // percentage
  line_total: number;
  pcs?: number;
  length?: number;
  width?: number;
  area?: number;
  calc_mode?: 'simple' | 'size' | 'area' | 'length' | 'weight';
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
  CreateQuote: undefined;
};

export type EmployeeStackParamList = {
  EmployeesList: undefined;
  EmployeeForm: { employee?: Employee };
};

export type ProductStackParamList = {
  ProductsList: undefined;
  ProductForm: { product?: Product };
};
