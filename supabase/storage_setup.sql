-- CampusIQ Storage Setup
-- Run this in your Supabase SQL Editor

-- 1. Create the 'avatars' bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 2. Set up RLS for the 'avatars' bucket
-- Allow public access to view avatars
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'avatars' );

-- Allow authenticated users to upload their own avatar
create policy "Authenticated users can upload an avatar"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = 'avatars'
);

-- Allow users to update their own avatar
create policy "Users can update their own avatar"
on storage.objects for update
to authenticated
using ( bucket_id = 'avatars' )
with check ( bucket_id = 'avatars' );

-- Allow users to delete their own avatar
create policy "Users can delete their own avatar"
on storage.objects for delete
to authenticated
using ( bucket_id = 'avatars' );
