-- ThreatLens AI Database Schema
-- Run this in your Supabase SQL Editor

-- Profiles table
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  clerk_id text unique,
  created_at timestamp with time zone default now()
);

-- Documents table
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  filename text not null,
  content text,
  created_at timestamp with time zone default now()
);

-- Threats table
create table if not exists threats (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  type text not null,
  cve text default 'N/A',
  severity text not null check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  affected_system text default 'Unknown',
  created_at timestamp with time zone default now()
);

-- Indexes for performance
create index if not exists idx_documents_user_id on documents(user_id);
create index if not exists idx_threats_document_id on threats(document_id);
create index if not exists idx_threats_severity on threats(severity);
create index if not exists idx_profiles_clerk_id on profiles(clerk_id);

-- Row Level Security (RLS) Policies
alter table profiles enable row level security;
alter table documents enable row level security;
alter table threats enable row level security;

-- Profiles: users can read/insert their own profile
create policy "Users can view own profile"
  on profiles for select
  using (true);

create policy "Users can insert own profile"
  on profiles for insert
  with check (true);

-- Documents: users can CRUD their own documents
create policy "Users can view own documents"
  on documents for select
  using (true);

create policy "Users can insert own documents"
  on documents for insert
  with check (true);

create policy "Users can delete own documents"
  on documents for delete
  using (true);

-- Threats: users can CRUD threats on their documents
create policy "Users can view threats"
  on threats for select
  using (true);

create policy "Users can insert threats"
  on threats for insert
  with check (true);

create policy "Users can delete threats"
  on threats for delete
  using (true);
