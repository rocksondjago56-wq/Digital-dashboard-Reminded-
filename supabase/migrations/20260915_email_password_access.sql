-- Email/password access states. This migration preserves all existing data.
alter table public.profiles
  add column if not exists access_status text not null default 'active'
    check (access_status in ('active', 'temporary', 'pending_review')),
  add column if not exists access_expires_at timestamptz;

-- Existing approved records remain active. New staff state changes are made
-- only by the Render backend using the Supabase service role key.
update public.profiles
set access_status = 'active'
where access_status is null;
