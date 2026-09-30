type DatabaseError = { code?: string | null; message?: string | null } | null | undefined;

const blogSchemaNames = [
  "author_name",
  "blog_categories",
  "blog_post_categories",
  "content_html",
  "origin",
  "reading_time_minutes",
  "search_blog_posts",
  "synced_at",
];

/**
 * Recognizes only the expected deployment-order errors from the blog migration.
 * Other database failures must continue to surface instead of being hidden.
 */
export function isBlogSchemaUnavailable(error: DatabaseError) {
  if (!error?.code) return false;
  if (["PGRST200", "PGRST202", "PGRST205"].includes(error.code)) {
    return blogSchemaNames.some((name) => error.message?.includes(name));
  }
  return error.code === "42703" && blogSchemaNames.some((name) => error.message?.includes(name));
}
