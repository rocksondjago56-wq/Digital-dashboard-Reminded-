-- Replaces the earlier dual-code metadata with one OTP hash per profile.
alter table public.profiles
  drop column if exists email_verified,
  drop column if exists phone_verified,
  drop column if exists email_code_hash,
  drop column if exists phone_code_hash;

alter table public.profiles
  add column if not exists verification_code_hash text,
  add column if not exists verification_expires_at timestamptz;
