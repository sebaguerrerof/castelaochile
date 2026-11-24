-- SECURITY INVOKER plans check permissions on the staff predicate even when
-- the service-role branch bypasses that predicate. No anonymous access changes.
grant execute on function private.is_active_staff() to service_role;
