-- Track account activation for administrator-provisioned department identities.
alter table public.profiles
  add column if not exists is_verified boolean not null default true,
  add column if not exists verification_code_hash text,
  add column if not exists verification_expires_at timestamptz;
