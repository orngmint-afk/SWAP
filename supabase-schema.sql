-- ============================================================
-- SWAP — Supabase Schema
-- Run this in your Supabase project → SQL Editor
-- ============================================================

-- Profiles (auto-created on signup via trigger)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  avg_rating numeric default 0,
  sale_count integer default 0,
  created_at timestamptz default now()
);

-- Parts listings
create table if not exists parts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  category text not null,
  condition text not null check (condition in ('New','Good','Fair')),
  price numeric not null,
  fits text,
  part_number text,
  location text not null,
  description text,
  images text[] default '{}',
  sold boolean default false,
  created_at timestamptz default now()
);

-- Message threads (one per buyer+part combo)
create table if not exists threads (
  id uuid primary key default gen_random_uuid(),
  part_id uuid references parts(id) on delete cascade,
  buyer_id uuid references profiles(id) on delete cascade,
  seller_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(part_id, buyer_id)
);

-- Messages
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references threads(id) on delete cascade,
  sender_id uuid references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

-- ============================================================
-- Auto-create profile on signup
-- ============================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- Row Level Security
-- ============================================================
alter table profiles enable row level security;
alter table parts enable row level security;
alter table threads enable row level security;
alter table messages enable row level security;

-- Profiles: anyone can read, only owner can update
create policy "Public profiles" on profiles for select using (true);
create policy "Own profile update" on profiles for update using (auth.uid() = id);

-- Parts: anyone can read, only owner can insert/update/delete
create policy "Public parts" on parts for select using (true);
create policy "Insert own part" on parts for insert with check (auth.uid() = user_id);
create policy "Update own part" on parts for update using (auth.uid() = user_id);
create policy "Delete own part" on parts for delete using (auth.uid() = user_id);

-- Threads: only participants can read/insert
create policy "Thread participants" on threads for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);
create policy "Create thread" on threads for insert
  with check (auth.uid() = buyer_id);

-- Messages: only thread participants
create policy "Message participants" on messages for select
  using (
    exists (
      select 1 from threads t
      where t.id = thread_id
      and (t.buyer_id = auth.uid() or t.seller_id = auth.uid())
    )
  );
create policy "Send message" on messages for insert
  with check (
    auth.uid() = sender_id and
    exists (
      select 1 from threads t
      where t.id = thread_id
      and (t.buyer_id = auth.uid() or t.seller_id = auth.uid())
    )
  );

-- ============================================================
-- Storage bucket for part images
-- ============================================================
insert into storage.buckets (id, name, public)
values ('part-images', 'part-images', true)
on conflict do nothing;

create policy "Public image read" on storage.objects for select
  using (bucket_id = 'part-images');
create policy "Authenticated upload" on storage.objects for insert
  with check (bucket_id = 'part-images' and auth.role() = 'authenticated');
create policy "Owner delete" on storage.objects for delete
  using (bucket_id = 'part-images' and auth.uid()::text = (storage.foldername(name))[1]);
