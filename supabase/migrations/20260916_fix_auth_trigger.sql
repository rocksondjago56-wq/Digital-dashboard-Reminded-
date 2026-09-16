-- Fix Supabase auth.users trigger error: "Database error saving new user"
-- Cause: handle_new_user() tried to insert into phone, certificate, staff_id, designation
-- which were missing on public.profiles, causing the trigger to throw and abort user creation.

-- 1. Ensure all expected profile columns exist
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS certificate text,
  ADD COLUMN IF NOT EXISTS staff_id text,
  ADD COLUMN IF NOT EXISTS designation text,
  ADD COLUMN IF NOT EXISTS requested_role text,
  ADD COLUMN IF NOT EXISTS requested_courses text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;

-- 2. Add student_head to enum if not already present
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'student_head';

-- 3. Replace handle_new_user with a robust function that will NEVER crash auth.users insertion
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_val public.user_role;
  raw_role text;
  user_name text;
BEGIN
  raw_role := LOWER(COALESCE(
    NEW.raw_user_meta_data->>'role',
    NEW.raw_user_meta_data->>'requested_role',
    'student'
  ));

  IF raw_role IN ('student', 'student_head', 'lecturer', 'admin') THEN
    user_role_val := raw_role::public.user_role;
  ELSE
    user_role_val := 'student'::public.user_role;
  END IF;

  user_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'fullName', ''),
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    SPLIT_PART(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (
    id,
    name,
    email,
    role,
    department,
    profile_picture_url,
    phone,
    year,
    certificate,
    student_id,
    staff_id,
    designation,
    courses,
    program
  )
  VALUES (
    NEW.id,
    user_name,
    NEW.email,
    user_role_val,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'department', ''), 'Graphic Design'),
    COALESCE(NEW.raw_user_meta_data->>'profile_picture_url', NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    NULLIF(NEW.raw_user_meta_data->>'year', ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'certificate', ''), NULLIF(NEW.raw_user_meta_data->>'program', '')),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'indexNumber', ''), NULLIF(NEW.raw_user_meta_data->>'student_id', '')),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'lecturerId', ''), NULLIF(NEW.raw_user_meta_data->>'staff_id', '')),
    NULLIF(NEW.raw_user_meta_data->>'designation', ''),
    '{}'::text[],
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'program', ''), NULLIF(NEW.raw_user_meta_data->>'certificate', ''))
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = COALESCE(EXCLUDED.role, public.profiles.role),
    department = COALESCE(EXCLUDED.department, public.profiles.department),
    profile_picture_url = COALESCE(EXCLUDED.profile_picture_url, public.profiles.profile_picture_url),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    year = COALESCE(EXCLUDED.year, public.profiles.year),
    certificate = COALESCE(EXCLUDED.certificate, public.profiles.certificate),
    student_id = COALESCE(EXCLUDED.student_id, public.profiles.student_id),
    staff_id = COALESCE(EXCLUDED.staff_id, public.profiles.staff_id),
    designation = COALESCE(EXCLUDED.designation, public.profiles.designation),
    program = COALESCE(EXCLUDED.program, public.profiles.program),
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and continue so auth.users insertion is NEVER blocked
    RAISE WARNING 'handle_new_user error for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;
