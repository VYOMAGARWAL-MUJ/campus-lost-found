-- CampusKind schema for Supabase (run in SQL Editor).
-- Before production, configure Authentication > URL Configuration and an SMTP/email provider.
-- The client-side domain check improves UX; the RLS policies below enforce the domain on the server too.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (char_length(username) between 1 and 80),
  email text not null,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('lost', 'found')),
  title text not null check (char_length(title) between 1 and 80),
  category text not null,
  description text not null check (char_length(description) between 1 and 600),
  location text not null check (char_length(location) between 1 and 120),
  item_date date not null default current_date,
  phone text not null check (phone ~ '^[0-9]{8,15}$'),
  image_url text,
  created_at timestamptz not null default now()
);

create index if not exists items_created_at_idx on public.items (created_at desc);
create index if not exists items_status_idx on public.items (status);
create index if not exists items_category_idx on public.items (category);

alter table public.profiles enable row level security;
alter table public.items enable row level security;

-- Change muj.manipal.edu to your institution's actual email domain before running.
create or replace function public.is_allowed_college_email()
returns boolean
language sql stable
security definer
set search_path = ''
as $$
  select coalesce(
    lower((select email from auth.users where id = auth.uid())) like '%@muj.manipal.edu',
    false
  );
$$;

grant execute on function public.is_allowed_college_email() to authenticated;

drop policy if exists "Campus users can read profiles" on public.profiles;
create policy "Campus users can read profiles" on public.profiles
for select to authenticated using (public.is_allowed_college_email());

drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile" on public.profiles
for insert to authenticated
with check (id = auth.uid() and public.is_allowed_college_email());

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles
for update to authenticated
using (id = auth.uid() and public.is_allowed_college_email())
with check (id = auth.uid() and public.is_allowed_college_email());

drop policy if exists "Campus users can read listings" on public.items;
create policy "Campus users can read listings" on public.items
for select to authenticated using (public.is_allowed_college_email());

drop policy if exists "Campus users can post listings" on public.items;
create policy "Campus users can post listings" on public.items
for insert to authenticated
with check (user_id = auth.uid() and public.is_allowed_college_email());

drop policy if exists "Owners can update their own listings" on public.items;
create policy "Owners can update their own listings" on public.items
for update to authenticated
using (user_id = auth.uid() and public.is_allowed_college_email())
with check (user_id = auth.uid() and public.is_allowed_college_email());

drop policy if exists "Owners can delete their own listings" on public.items;
create policy "Owners can delete their own listings" on public.items
for delete to authenticated
using (user_id = auth.uid() and public.is_allowed_college_email());

-- Create a profile automatically when an account is first created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if lower(new.email) not like '%@muj.manipal.edu' then
    raise exception 'Only approved college email addresses can register';
  end if;
  insert into public.profiles (id, username, email, phone)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'username', ''), split_part(new.email, '@', 1)),
    new.email,
    nullif(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (id) do update set
    username = excluded.username,
    phone = coalesce(excluded.phone, public.profiles.phone);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update of email, raw_user_meta_data on auth.users
for each row execute procedure public.handle_new_user();

-- IMPORTANT:
-- Replace every occurrence of muj.manipal.edu above with your real college domain.
-- Do not expose a service-role key in frontend environment variables.
-- Public listing reads intentionally include phone numbers because WhatsApp contact is a core feature.
-- If you want stronger privacy, add an authenticated contact request flow instead of showing phone numbers.
