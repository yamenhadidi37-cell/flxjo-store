-- ==========================================
-- FLEX JO - Supabase Schema Setup SQL
-- ==========================================
-- Copy and paste this code into the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- and click "Run" to create the required tables for statistics.

-- 1. Create the 'visits' table
CREATE TABLE IF NOT EXISTS visits (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ip TEXT,
  country TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create the 'searches' table
CREATE TABLE IF NOT EXISTS searches (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  query TEXT NOT NULL,
  lang TEXT,
  country TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create the 'clicks' table
CREATE TABLE IF NOT EXISTS clicks (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  media_id TEXT NOT NULL,
  title TEXT NOT NULL,
  media_type TEXT,
  country TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS) on all tables (Standard security)
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE clicks ENABLE ROW LEVEL SECURITY;

-- 5. Create insert policies for public access
CREATE POLICY "Allow anon insert to visits" ON visits FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon insert to searches" ON searches FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon insert to clicks" ON clicks FOR INSERT WITH CHECK (true);

-- 6. Create select policies for admin read access
CREATE POLICY "Allow anon select from visits" ON visits FOR SELECT USING (true);
CREATE POLICY "Allow anon select from searches" ON searches FOR SELECT USING (true);
CREATE POLICY "Allow anon select from clicks" ON clicks FOR SELECT USING (true);

-- 7. Create the 'visitors' table for durable user session tracking
CREATE TABLE IF NOT EXISTS visitors (
  user_id TEXT PRIMARY KEY,
  country TEXT,
  browser TEXT,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  searches JSONB DEFAULT '[]'::jsonb,
  clicked_media JSONB DEFAULT '[]'::jsonb
);

ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon insert to visitors" ON visitors FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update to visitors" ON visitors FOR UPDATE USING (true);
CREATE POLICY "Allow anon select from visitors" ON visitors FOR SELECT USING (true);
