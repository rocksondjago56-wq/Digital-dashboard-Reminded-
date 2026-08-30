-- Run this after schema.sql. It records a lecturer request without granting
-- lecturer permissions until a department administrator approves the profile.

alter table public.profiles
  add column if not exists requested_role text check (requested_role in ('student', 'lecturer')),
  add column if not exists requested_courses text[] not null default '{}';

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, role, requested_role, requested_courses)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1)),
    new.email,
    'student',
    case when new.raw_user_meta_data ->> 'requested_role' = 'lecturer' then 'lecturer' else 'student' end,
    case
      when jsonb_typeof(new.raw_user_meta_data -> 'requested_courses') = 'array'
      then array(select jsonb_array_elements_text(new.raw_user_meta_data -> 'requested_courses'))
      else '{}'
    end
  );
  return new;
end;
$$;
