-- Auth module: per-user profile data, layered on top of Supabase's built-in auth.users.
-- Run this in the Supabase SQL Editor (or via `supabase db push` once the CLI is linked).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

-- RLS is deny-by-default: with it enabled and no policies, nobody (not even
-- authenticated users) can read or write this table until a policy allows it.
alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row whenever someone signs up, so the app never has
-- to remember to do it client-side.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
