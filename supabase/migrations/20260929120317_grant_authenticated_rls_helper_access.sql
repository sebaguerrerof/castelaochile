-- RLS policies reference these helpers from the non-exposed private schema.
-- Authenticated requests need schema usage plus execute permission on only the
-- policy entry points. The lower-level current_admin_role() helper remains
-- unavailable for direct execution by client roles.
grant usage on schema private to authenticated;

grant execute on function private.is_active_staff() to authenticated;
grant execute on function private.is_editor_or_superadmin() to authenticated;
grant execute on function private.is_superadmin() to authenticated;
