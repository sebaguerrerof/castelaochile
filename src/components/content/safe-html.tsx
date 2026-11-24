import { sanitizeBlogHtml } from "@/lib/blog/content";

/** HTML is sanitized on import/save and sanitized again here before rendering. */
export function SafeHtml({ value }: { value: string }) {
  const html = sanitizeBlogHtml(value);
  return <div className="article-body" dangerouslySetInnerHTML={{ __html: html }} />;
}
