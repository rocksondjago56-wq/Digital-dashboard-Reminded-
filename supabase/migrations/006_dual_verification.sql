-- Apply this migration to an existing Supabase project after the earlier portal migrations.
alter table public.profiles
  add column if not exists phone text unique,
  add column if not exists is_verified boolean not null default false,
  add column if not exists email_verified boolean not null default false,
  add column if not exists phone_verified boolean not null default false,
  add column if not exists email_code_hash text,
  add column if not exists phone_code_hash text,
  add column if not exists verification_expires_at timestamptz;

-- Profiles are verification metadata for the portal. Do not store raw codes here.
