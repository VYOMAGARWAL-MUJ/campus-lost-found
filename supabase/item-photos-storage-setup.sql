-- CampusKind photo upload setup
-- Run in Supabase SQL Editor once. This creates a public bucket for listing photos.
-- Public URLs are viewable by anyone; do not upload sensitive documents or IDs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-photos', 'item-photos', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];

-- Current CampusKind uses a no-auth visitor flow, so allow anonymous image uploads.
-- This is suitable for a prototype, not a secure public launch. Add rate limits/auth before production.
drop policy if exists "CampusKind visitors can upload item photos" on storage.objects;
create policy "CampusKind visitors can upload item photos"
on storage.objects for insert to anon
with check (bucket_id = 'item-photos');

drop policy if exists "Anyone can view CampusKind item photos" on storage.objects;
create policy "Anyone can view CampusKind item photos"
on storage.objects for select to anon
using (bucket_id = 'item-photos');
