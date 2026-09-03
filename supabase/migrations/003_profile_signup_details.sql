-- Run this once on an existing Supabase project after schema.sql and 002.
-- It lets portal signups appear with their full profile details.

alter type public.user_role add value if not exists 'student_head';

alter table public.profiles
  add column if not exists requested_role text,
  add column if not exists requested_courses text[] not null default '{}',
  add column if not exists staff_id text unique,
  add column if not exists designation text;

alter table public.profiles drop constraint if exists profiles_requested_role_check;
alter table public.profiles
  add constraint profiles_requested_role_check
  check (requested_role in ('student', 'student_head', 'lecturer', 'admin'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  requested text := coalesce(nullif(new.raw_user_meta_data ->> 'requested_role', ''), 'student');
  requested_courses text[] := case
    when jsonb_typeof(new.raw_user_meta_data -> 'requested_courses') = 'array'
    then array(select jsonb_array_elements_text(new.raw_user_meta_data -> 'requested_courses'))
    else '{}'
  end;
begin
  insert into public.profiles (
    id,
    name,
    email,
    role,
    year,
    student_id,
    staff_id,
    designation,
    courses,
    requested_role,
    requested_courses
  )
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1)),
    new.email,
    'student'::public.user_role,
    nullif(new.raw_user_meta_data ->> 'year', ''),
    nullif(new.raw_user_meta_data ->> 'student_id', ''),
    nullif(new.raw_user_meta_data ->> 'staff_id', ''),
    nullif(new.raw_user_meta_data ->> 'designation', ''),
    requested_courses,
    case
      when requested in ('student', 'student_head', 'lecturer', 'admin') then requested
      else 'student'
    end,
    requested_courses
  );
  return new;
end;
$$;
