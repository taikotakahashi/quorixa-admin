-- Mirror: normalize team_members to one person per row.
-- Prefer applying the copy in new-group-site/supabase/migrations/20260925150000_normalize_people.sql

alter table public.team_members
  add column if not exists team_role text,
  add column if not exists leadership_role text;
