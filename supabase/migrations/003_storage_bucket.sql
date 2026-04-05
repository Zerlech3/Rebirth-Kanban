-- Create storage bucket for attachments
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments',
  'attachments',
  true,
  10485760, -- 10MB
  array['image/jpeg','image/png','image/gif','image/webp','application/pdf',
        'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain','text/csv','application/zip','application/x-zip-compressed']
)
on conflict (id) do nothing;

-- Allow authenticated users to upload
create policy "Authenticated users can upload attachments"
on storage.objects for insert
to authenticated
with check (bucket_id = 'attachments');

-- Allow authenticated users to delete their own files
create policy "Users can delete own attachments"
on storage.objects for delete
to authenticated
using (bucket_id = 'attachments' and auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access
create policy "Public read access for attachments"
on storage.objects for select
to public
using (bucket_id = 'attachments');
