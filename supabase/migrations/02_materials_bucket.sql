-- 1. Ensure the 'materials' bucket is set to public
update storage.buckets
set public = true
where id = 'materials';

-- 2. Create policy to allow everyone to SELECT from the 'materials' bucket
create policy "Materials are publicly accessible"
on storage.objects for select
using ( bucket_id = 'materials' );

-- 3. Allow anonymous/authenticated users to insert into course_materials (for the sync script)
-- In production, you would restrict this, but for now it allows the script to run seamlessly.
create policy "Allow inserts to course_materials"
on public.course_materials for insert
with check (true);
