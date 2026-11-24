-- Add legacy Word to the existing private attachment formats; access policies stay unchanged.
alter table public.patient_library_attachments
  drop constraint patient_library_attachments_mime_check,
  add constraint patient_library_attachments_mime_check check (mime in (
    'application/pdf','application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg','image/png','image/webp'
  ));
update storage.buckets
set allowed_mime_types = array_append(allowed_mime_types, 'application/msword')
where id = 'patient-library' and not public
  and not ('application/msword' = any(allowed_mime_types));
