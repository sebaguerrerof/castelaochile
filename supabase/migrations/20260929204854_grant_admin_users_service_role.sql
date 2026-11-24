-- The server-only invitation flow creates the corresponding staff profile
-- after Auth accepts an invite. Supabase's 2026 Data API defaults require this
-- privilege to be explicit on new branches/projects.

grant select, insert, update, delete on table public.admin_users to service_role;
