-- Same defect as 20261124130000 (CMS): PostgREST 14 retries a custom SQLSTATE 40001 raised from an RPC
-- forever. "El registro cambió" style conflicts in the follow-up (care_*) and library functions are
-- application conflicts, so they now raise PT409 (HTTP 409, returned once, never retried).
-- The functions are rebuilt from their own definition, so only the error code changes; owner, grants,
-- SECURITY DEFINER and search_path are preserved by CREATE OR REPLACE.
begin;

do $$
declare f record; changed integer := 0;
begin
  for f in
    select p.oid
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private') and p.prosrc ~ 'errcode\s*=\s*''40001'''
    order by n.nspname, p.proname
  loop
    execute regexp_replace(pg_get_functiondef(f.oid), 'errcode\s*=\s*''40001''', 'errcode=''PT409''', 'g');
    changed := changed + 1;
  end loop;
  raise notice 'functions rebuilt with PT409: %', changed;
end $$;

commit;
