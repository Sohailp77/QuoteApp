// ============================================================
// SUPABASE CONFIG — Replace with your actual Supabase project
// ============================================================
// 1. Go to https://supabase.com → create a new project
// 2. Settings → API → copy Project URL and anon public key
// 3. Run the SQL from schema.sql in Supabase SQL Editor
// ============================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dxxtxztjnwkxrryqefmg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4dHh6dGpxbndreHJycnFlZm1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNjY3NjAsImV4cCI6MjA5NjY0Mjc2MH0.egaRzHnN4BYS9qtSYcOtTg22lJMx9kMudFEy9E8YoKQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export default supabase;
