-- Add student certificate programmes and targeting for academic posts.
alter table public.profiles
  add column if not exists certificate text;

alter table public.deadlines
  add column if not exists certificate text not null default 'All Certificates',
  add column if not exists year text not null default 'All Years';

alter table public.announcements
  add column if not exists certificate text not null default 'All Certificates',
  add column if not exists year text not null default 'All Years';
