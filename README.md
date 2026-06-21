# SWAP — Car Parts Marketplace

A mobile-friendly React + Supabase app for buying and selling second-hand car parts.

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free project
2. Copy your **Project URL** and **anon public key** from Settings → API
3. Copy `.env.example` to `.env` and paste your values:

```
REACT_APP_SUPABASE_URL=https://xxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Create the database tables

Run this SQL in your Supabase SQL Editor (Dashboard → SQL Editor → New query):

```sql
-- Profiles (auto-created on signup)
create table profiles (
  id uuid references auth.users primary key,
  full_name text,
  avatar_url text,
  avg_rating numeric default 0,
  sale_count int default 0,
  created_at timestamptz default now()
);

-- Auto-create profile on user signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Parts listings
create table parts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  title text not null,
  category text,
  condition text,
  price numeric not null,
  fits text,
  part_number text,
  location text,
  description text,
  images text[],
  sold boolean default false,
  created_at timestamptz default now()
);

-- Message threads
create table threads (
  id uuid primary key default gen_random_uuid(),
  part_id uuid references parts(id) on delete cascade,
  buyer_id uuid references profiles(id),
  seller_id uuid references profiles(id),
  updated_at timestamptz default now()
);

-- Messages
create table messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references threads(id) on delete cascade,
  sender_id uuid references profiles(id),
  content text not null,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table profiles enable row level security;
alter table parts enable row level security;
alter table threads enable row level security;
alter table messages enable row level security;

-- RLS Policies
create policy "Public profiles" on profiles for select using (true);
create policy "Own profile" on profiles for update using (auth.uid() = id);

create policy "Public parts" on parts for select using (true);
create policy "Insert own parts" on parts for insert with check (auth.uid() = user_id);
create policy "Update own parts" on parts for update using (auth.uid() = user_id);
create policy "Delete own parts" on parts for delete using (auth.uid() = user_id);

create policy "Thread participants" on threads for select using (auth.uid() = buyer_id or auth.uid() = seller_id);
create policy "Create thread" on threads for insert with check (auth.uid() = buyer_id);

create policy "Thread messages" on messages for select using (
  exists (select 1 from threads where id = thread_id and (buyer_id = auth.uid() or seller_id = auth.uid()))
);
create policy "Send message" on messages for insert with check (auth.uid() = sender_id);
```

### 4. Create Storage bucket

In Supabase Dashboard → Storage → New bucket:
- Name: `part-images`
- Public: ✅ Yes

Add this storage policy (Storage → part-images → Policies):
```sql
-- Allow authenticated users to upload
create policy "Upload images" on storage.objects for insert with check (auth.role() = 'authenticated');
-- Allow public read
create policy "Public images" on storage.objects for select using (bucket_id = 'part-images');
```

### 5. Run the app
```bash
npm start
```

App opens at [http://localhost:3000](http://localhost:3000)

## Features
- 🔐 Email/password auth (Supabase Auth)
- 📋 Browse & search listings with category filters
- 📸 Photo upload (up to 6 images per listing)
- 💬 Real-time messaging between buyers and sellers
- ⭐ Seller profiles with ratings
- 📱 Mobile-first, works great on any screen

## Tech Stack
- **React** 18 with React Router 6
- **Supabase** — auth, database (PostgreSQL), storage, real-time
- **Tabler Icons** — icon set
