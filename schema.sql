-- ============================================================
-- QuoteApp — Supabase Database Schema
-- ============================================================
-- Run this entire file in your Supabase SQL Editor:
-- Supabase → SQL Editor → New query → Paste → Run
-- ============================================================

-- EMPLOYEES
create table if not exists employees (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  name text not null,
  email text not null,
  phone text default '',
  role text not null,
  department text default '',
  avatar_url text,
  created_at timestamptz default now()
);

-- PRODUCTS
create table if not exists products (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  name text not null,
  description text default '',
  unit_price numeric(12, 2) not null default 0,
  unit text default 'piece',
  category text default '',
  sku text default '',
  created_at timestamptz default now()
);

-- QUOTES
create table if not exists quotes (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
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
  created_at timestamptz default now()
);

-- QUOTE ITEMS
create table if not exists quote_items (
  id uuid default gen_random_uuid() primary key,
  quote_id uuid not null references quotes(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text not null,
  unit_price numeric(12, 2) not null,
  quantity integer not null default 1,
  discount numeric(5, 2) not null default 0,
  line_total numeric(14, 2) not null,
  created_at timestamptz default now()
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
-- NOTE: Since we are using Firebase Auth (not Supabase Auth),
-- we pass user_id from the app and filter by it in queries.
-- For production, consider adding a custom JWT claim flow.
-- ============================================================

alter table employees enable row level security;
alter table products enable row level security;
alter table quotes enable row level security;
alter table quote_items enable row level security;

-- Allow full access (for now, using app-level user_id filtering)
-- Replace with proper RLS policies once Firebase JWT is wired to Supabase
create policy "Allow all for authenticated users" on employees for all using (true);
create policy "Allow all for authenticated users" on products for all using (true);
create policy "Allow all for authenticated users" on quotes for all using (true);
create policy "Allow all for authenticated users" on quote_items for all using (true);

-- ============================================================
-- Indexes for performance
-- ============================================================
create index if not exists idx_employees_user_id on employees(user_id);
create index if not exists idx_products_user_id on products(user_id);
create index if not exists idx_quotes_user_id on quotes(user_id);
create index if not exists idx_quote_items_quote_id on quote_items(quote_id);
