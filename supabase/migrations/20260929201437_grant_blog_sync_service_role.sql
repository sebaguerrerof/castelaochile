-- New public-schema tables are no longer automatically exposed to the Data
-- API. Grant only the server-side service role the privileges required by the
-- importer; browser roles remain governed by the narrower grants and RLS.

grant select, insert, update, delete on table public.content_posts to service_role;
grant select, insert, update, delete on table public.blog_categories to service_role;
grant select, insert, update, delete on table public.blog_post_categories to service_role;
