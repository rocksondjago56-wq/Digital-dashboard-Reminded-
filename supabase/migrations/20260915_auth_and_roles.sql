-- Run this after supabase/schema.sql in the Supabase SQL Editor.
-- It keeps roles explicit and supports backend-managed registration codes.

alter table public.profiles
  add column if not exists program text;

alter table public.profiles
  alter column role drop default;

-- The backend creates this table with Prisma. Older Supabase projects may not
-- have it yet, so only extend and secure it when it already exists.
do $$
begin
  if to_regclass('public.registration_codes') is not null then
    alter table public.registration_codes
      add column if not exists revoked_at timestamptz,
      add column if not exists revoked_by uuid references public.profiles(id);
    alter table public.registration_codes enable row level security;
  end if;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id, name, email, role, profile_picture_url, phone, year, certificate,
    student_id, staff_id, designation, courses, program
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    null,
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'),
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'year',
    new.raw_user_meta_data ->> 'certificate',
    new.raw_user_meta_data ->> 'student_id',
    new.raw_user_meta_data ->> 'staff_id',
    new.raw_user_meta_data ->> 'designation',
    coalesce(new.raw_user_meta_data -> 'requested_courses', '[]'::jsonb),
    new.raw_user_meta_data ->> 'program'
  )
  on conflict (id) do update set
    name = excluded.name,
    email = excluded.email,
    profile_picture_url = coalesce(excluded.profile_picture_url, public.profiles.profile_picture_url),
    phone = coalesce(excluded.phone, public.profiles.phone),
    year = coalesce(excluded.year, public.profiles.year),
    certificate = coalesce(excluded.certificate, public.profiles.certificate),
    student_id = coalesce(excluded.student_id, public.profiles.student_id),
    staff_id = coalesce(excluded.staff_id, public.profiles.staff_id),
    designation = coalesce(excluded.designation, public.profiles.designation),
    courses = case when excluded.courses = '[]'::jsonb then public.profiles.courses else excluded.courses end,
    program = coalesce(excluded.program, public.profiles.program);
  return new;
end;
$$;