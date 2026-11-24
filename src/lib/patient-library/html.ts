import sanitizeHtml from "sanitize-html";

/** Therapeutic text has no remote media, trackers, embedded frames or external viewer links. */
export function sanitizeTherapeuticHtml(value: string) {
  return sanitizeHtml(value, {
    allowedTags: ["p","br","h2","h3","strong","b","em","i","u","s","blockquote","ul","ol","li","hr","table","thead","tbody","tr","th","td"],
    allowedAttributes: {}, allowedSchemes: [], disallowedTagsMode: "discard",
  });
}
