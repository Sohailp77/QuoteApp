// Central TypeScript types for the Quote App

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'boss' | 'employee';
  tenant_id: string;
}

export interface Employee {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  avatar_url?: string;
  created_at: string;
  tenant_id?: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  unit_name?: string;
  metric_type?: 'fixed' | 'measured';
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  user_id: string;
  name: string;
  description: string;
  unit_price: number;
  unit: string;
  category: string;
  sku: string;
  created_at: string;
  cost_price?: number;
  stock_quantity?: number;
  barcode?: string;
  warehouse_location?: string;
}

export type QuoteStatus = 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired';

export interface QuoteItem {
  id: string;
  quote_id: string;
  product_id?: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  discount: number; // percentage
  line_total: number;
}

export interface Quote {
  id: string;
  user_id: string;
  quote_number: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
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
