-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- This sets up the one table this app needs, plus a storage bucket for the
-- actual photo files, with row-level security so only you can ever see
-- your own photos.

-- ============================================================
-- 1. PHOTOS table — one row per uploaded outfit photo
-- ============================================================
create table if not exists photos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  storage_path text not null,   -- path inside the 'outfits' storage bucket
  created_at timestamptz default now()
);

alter table photos enable row level security;

create policy "Users can view their own photos"
  on photos for select using (auth.uid() = user_id);

create policy "Users can insert their own photos"
  on photos for insert with check (auth.uid() = user_id);

create policy "Users can delete their own photos"
  on photos for delete using (auth.uid() = user_id);

create index if not exists photos_user_created_idx
  on photos (user_id, created_at desc);

-- ============================================================
-- 2. STORAGE — create a private bucket called "outfits"
-- ============================================================
-- Run this part too — it creates the bucket if it doesn't already exist.
insert into storage.buckets (id, name, public)
values ('outfits', 'outfits', false)
on conflict (id) do nothing;

-- Storage policies: users can only read/write/delete files inside their
-- own folder, named by their user id (e.g. "outfits/<user_id>/<filename>").
create policy "Users can view their own outfit files"
  on storage.objects for select
  using (bucket_id = 'outfits' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can upload their own outfit files"
  on storage.objects for insert
  with check (bucket_id = 'outfits' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own outfit files"
  on storage.objects for delete
  using (bucket_id = 'outfits' and (storage.foldername(name))[1] = auth.uid()::text);
