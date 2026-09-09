-- Run this entire script in Supabase Dashboard -> SQL Editor before connecting the app.
-- New public registrations are intentionally created as students. Lecturer and
-- administrator accounts must be approved by a department administrator.

create type public.user_role as enum ('student', 'student_head', 'lecturer', 'admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role public.user_role not null default 'student',
  department text not null default 'Graphic Design',
  year text,
  certificate text,
  student_id text unique,
  staff_id text unique,
  designation text,
  courses text[] not null default '{}',
  requested_role text check (requested_role in ('student', 'student_head', 'lecturer', 'admin')),
  requested_courses text[] not null default '{}',
  phone text unique,
  profile_picture_url text,
  is_verified boolean not null default false,
  email_verified boolean not null default false,
  phone_verified boolean not null default false,
  verification_code_hash text,
  email_code_hash text,
  phone_code_hash text,
  verification_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.deadlines (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  course text not null,
  certificate text not null default 'All Certificates',
  year text not null default 'All Years',
  due_date date not null,
  type text not null check (type in ('assignment', 'project', 'examination')),
  author_id uuid not null references public.profiles(id) on delete restrict,
  attachment_name text,
  attachment_url text,
  created_at timestamptz not null default now()
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  category text not null check (category in ('notice', 'update', 'calendar')),
  certificate text not null default 'All Certificates',
  year text not null default 'All Years',
  is_pinned boolean not null default false,
  author_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text not null,
  event_date date not null,
  event_time text,
  type text not null,
  organizer text not null,
  author_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.deadline_completions (
  student_id uuid not null references public.profiles(id) on delete cascade,
  deadline_id uuid not null references public.deadlines(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (student_id, deadline_id)
);

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
    phone,
    role,
    year,
    certificate,
    student_id,
    staff_id,
    designation,
    courses,
    requested_role,
    requested_courses,
    is_verified,
    email_verified,
    phone_verified
  )
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1)),
    new.email,
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    case
      when requested = 'student_head' then 'student_head'::public.user_role
      else 'student'::public.user_role
    end,
    nullif(new.raw_user_meta_data ->> 'year', ''),
    nullif(new.raw_user_meta_data ->> 'certificate', ''),
    nullif(new.raw_user_meta_data ->> 'student_id', ''),
    nullif(new.raw_user_meta_data ->> 'staff_id', ''),
    nullif(new.raw_user_meta_data ->> 'designation', ''),
    requested_courses,
    case
      when requested in ('student', 'student_head', 'lecturer', 'admin') then requested
      else 'student'
    end,
    requested_courses,
    coalesce((new.raw_user_meta_data ->> 'is_verified')::boolean, false),
    coalesce((new.raw_user_meta_data ->> 'email_verified')::boolean, false),
    coalesce((new.raw_user_meta_data ->> 'phone_verified')::boolean, false)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.prevent_self_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() = old.id and new.role is distinct from old.role then
    raise exception 'Roles can only be changed through an approved administrator workflow.';
  end if;
  return new;
end;
$$;

create trigger protect_profile_role
  before update on public.profiles for each row execute procedure public.prevent_self_role_change();

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('lecturer', 'admin'));
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

alter table public.profiles enable row level security;
alter table public.deadlines enable row level security;
alter table public.announcements enable row level security;
alter table public.events enable row level security;
alter table public.deadline_completions enable row level security;

create policy "authenticated users can read profiles" on public.profiles for select to authenticated using (true);
create policy "users can update their own non-role profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "authenticated users can read deadlines" on public.deadlines for select to authenticated using (true);
create policy "staff can create deadlines" on public.deadlines for insert to authenticated with check (public.is_staff() and author_id = auth.uid());
create policy "authors or admins can update deadlines" on public.deadlines for update to authenticated using (author_id = auth.uid() or public.is_admin()) with check (author_id = auth.uid() or public.is_admin());
create policy "authors or admins can delete deadlines" on public.deadlines for delete to authenticated using (author_id = auth.uid() or public.is_admin());

create policy "authenticated users can read announcements" on public.announcements for select to authenticated using (true);
create policy "staff can create announcements" on public.announcements for insert to authenticated with check (public.is_staff() and author_id = auth.uid());
create policy "authors or admins can update announcements" on public.announcements for update to authenticated using (author_id = auth.uid() or public.is_admin()) with check (author_id = auth.uid() or public.is_admin());
create policy "authors or admins can delete announcements" on public.announcements for delete to authenticated using (author_id = auth.uid() or public.is_admin());

create policy "authenticated users can read events" on public.events for select to authenticated using (true);
create policy "admins can create events" on public.events for insert to authenticated with check (public.is_admin() and author_id = auth.uid());
create policy "admins can update events" on public.events for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins can delete events" on public.events for delete to authenticated using (public.is_admin());

create policy "students can read their completion records" on public.deadline_completions for select to authenticated using (student_id = auth.uid());
create policy "students can add their completion records" on public.deadline_completions for insert to authenticated with check (student_id = auth.uid());
create policy "students can remove their completion records" on public.deadline_completions for delete to authenticated using (student_id = auth.uid());

-- Create this bucket in Storage, set it to public, then run these policies.
insert into storage.buckets (id, name, public) values ('profile-pictures', 'profile-pictures', true)
on conflict (id) do nothing;
create policy "users upload their own profile picture" on storage.objects for insert to authenticated
  with check (bucket_id = 'profile-pictures' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users update their own profile picture" on storage.objects for update to authenticated
  using (bucket_id = 'profile-pictures' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users delete their own profile picture" on storage.objects for delete to authenticated
  using (bucket_id = 'profile-pictures' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "profile pictures are public" on storage.objects for select using (bucket_id = 'profile-pictures');
