-- ============================================================
-- QuoteApp — Supabase Database Schema
-- ============================================================
-- Run this entire file in your Supabase SQL Editor:
-- Supabase → SQL Editor → New query → Paste → Run
-- ============================================================

-- USERS (Maps Firebase UID to roles/tenants)
create table if not exists users (
  id text primary key, -- Firebase Auth UID
  email text not null,
  display_name text,
  photo_url text,
  role text not null default 'boss',
  tenant_id text not null,
  created_at timestamptz default now()
);

-- EMPLOYEES
create table if not exists employees (
  id uuid default gen_random_uuid() primary key,
  user_id text default '',
  tenant_id text not null,
  name text not null,
  email text not null,
  phone text default '',
  role text not null,
  department text default '',
  avatar_url text,
  created_at timestamptz default now()
);

-- PRODUCT CATEGORIES
create table if not exists categories (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  tenant_id text not null,
  name text not null,
  description text default '',
  unit_name text default 'Pcs',
  metric_type text default 'fixed',
  is_active boolean not null default true,
  created_at timestamptz default now()
);

-- TAX RATES (SLABS)
create table if not exists tax_rates (
  id uuid default gen_random_uuid() primary key,
  tenant_id text not null,
  name text not null,
  rate numeric(5, 2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

-- PRODUCTS
create table if not exists products (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  tenant_id text not null,
  name text not null,
  description text default '',
  unit_price numeric(12, 2) not null default 0,
  cost_price numeric(12, 2),
  stock_quantity integer,
  barcode text default '',
  warehouse_location text default '',
  unit text default 'piece',
  category text default '',
  sku text default '',
  created_at timestamptz default now()
);

-- COMPANY SETTINGS (Owner/Bank details)
create table if not exists company_settings (
  tenant_id text primary key,
  company_name text default '',
  address text default '',
  phone text default '',
  email text default '',
  bank_name text default '',
  account_number text default '',
  ifsc_code text default '',
  gst_number text default '',
  created_at timestamptz default now()
);

-- QUOTES
create table if not exists quotes (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  tenant_id text not null,
  quote_number text not null unique,
  client_name text not null,
  client_email text not null,
  client_phone text default '',
  status text not null default 'Draft'
    check (status in ('Draft', 'Sent', 'Accepted', 'Rejected', 'Expired')),
  subtotal numeric(14, 2) not null default 0,
  discount numeric(14, 2) not null default 0,
  tax numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  notes text default '',
  valid_until timestamptz,
  payment_status text default 'Pending',
  payment_method text default '',
  delivery_date text default '',
  delivery_partner text default '',
  tracking_number text default '',
  delivery_status text default 'Pending',
  delivery_note text default '',
  items jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
-- NOTE: Since we are using Firebase Auth (not Supabase Auth),
-- we pass user_id/tenant_id from the app and filter by it.
-- ============================================================

alter table users enable row level security;
alter table employees enable row level security;
alter table categories enable row level security;
alter table tax_rates enable row level security;
alter table products enable row level security;
alter table company_settings enable row level security;
alter table quotes enable row level security;

-- Allow full access (using app-level filtering)
create policy "Allow all for authenticated users" on users for all using (true);
create policy "Allow all for authenticated users" on employees for all using (true);
create policy "Allow all for authenticated users" on categories for all using (true);
create policy "Allow all for authenticated users" on tax_rates for all using (true);
create policy "Allow all for authenticated users" on products for all using (true);
create policy "Allow all for authenticated users" on company_settings for all using (true);
create policy "Allow all for authenticated users" on quotes for all using (true);

-- ============================================================
-- Indexes for performance
-- ============================================================
create index if not exists idx_users_tenant_id on users(tenant_id);
create index if not exists idx_employees_tenant_id on employees(tenant_id);
create index if not exists idx_categories_tenant_id on categories(tenant_id);
create index if not exists idx_tax_rates_tenant_id on tax_rates(tenant_id);
create index if not exists idx_products_tenant_id on products(tenant_id);
create index if not exists idx_quotes_tenant_id on quotes(tenant_id);
