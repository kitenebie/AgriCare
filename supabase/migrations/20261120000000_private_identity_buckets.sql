insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('farmer_identity', 'farmer_identity', false, 8388608, array['image/jpeg', 'image/png']),
  ('technician_identity', 'technician_identity', false, 8388608, array['image/jpeg', 'image/png'])
on conflict (id) do update
set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

update storage.buckets
set public = false, file_size_limit = 8388608, allowed_mime_types = array['image/jpeg', 'image/png']
where id in ('farmers_proof', 'technician_proof');

drop policy if exists registration_documents_service_only on storage.objects;
create policy registration_documents_service_only
on storage.objects as restrictive
for all to anon, authenticated
using (bucket_id not in ('farmer_identity', 'technician_identity', 'farmers_proof', 'technician_proof'))
with check (bucket_id not in ('farmer_identity', 'technician_identity', 'farmers_proof', 'technician_proof'));
