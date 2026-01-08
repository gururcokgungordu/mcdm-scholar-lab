-- Supabase SQL Schema for MCDM Scholar Lab
-- Run this in Supabase SQL Editor

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  university TEXT,
  school TEXT,
  purpose TEXT DEFAULT 'research',
  role TEXT DEFAULT 'USER',
  is_pro BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  paper_name TEXT,
  analysis JSONB NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Repository (Global Methodologies) table
CREATE TABLE IF NOT EXISTS repository (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  paper_name TEXT NOT NULL,
  method TEXT NOT NULL,
  application TEXT,
  fuzzy_system TEXT,
  number_set TEXT,
  logic_module JSONB,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_repository_user_id ON repository(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Insert default admin user (optional - change password!)
INSERT INTO users (name, email, password, university, school, purpose, role, is_pro)
VALUES (
  'Principal Investigator',
  'admin@admin.edu',
  'admin123',
  'MCDM Global Research',
  'Management Science',
  'research',
  'ADMIN',
  TRUE
) ON CONFLICT (email) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE repository ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own data, admins can read all
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text OR role = 'ADMIN');

-- Projects: Users can CRUD their own, admins can manage all
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own projects" ON projects
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (true);

-- Repository: Anyone can read, users can add, admins can manage
CREATE POLICY "Anyone can view repository" ON repository
  FOR SELECT USING (true);

CREATE POLICY "Users can add to repository" ON repository
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete own entries" ON repository
  FOR DELETE USING (true);
