-- Run this in Supabase SQL Editor once, before using save/load.

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  files jsonb not null,
  dependencies jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Row Level Security: locked down by default. The app talks to this table
-- through the server-side service-role key (app/api/projects/route.js),
-- which bypasses RLS, so this is safe to leave restrictive.
alter table projects enable row level security;
