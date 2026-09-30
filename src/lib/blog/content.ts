import sanitizeHtmlLibrary from "sanitize-html";

const allowedTags = [
  "p", "h2", "h3", "h4", "strong", "em", "ul", "ol", "li", "a",
  "blockquote", "img", "figure", "figcaption", "hr", "br", "code", "pre",
  "table", "thead", "tbody", "tr", "th", "td",
];

const namedEntities: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

function decodeHtmlEntities(value: string) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code.startsWith("#x")) return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
    if (code.startsWith("#")) return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
    return namedEntities[code.toLowerCase()] ?? entity;
  });
}

/** Removes known WordPress shortcodes while keeping their editorial text. */
export function removeLegacyShortcodes(value: string) {
  return value
    .replace(/\[(?:\/?)(?:caption|embed|audio|video|gallery|playlist|contact-form-7|vc_[a-z0-9_-]+|et_pb_[a-z0-9_-]+)(?:\s[^\]]*)?\]/gi, "")
    .replace(/\[(?:gallery|playlist|contact-form-7)(?:\s[^\]]*)?\]/gi, "");
}

export function isSafeEditorialUrl(value: string, allowRelative = true) {
  if (allowRelative && value.startsWith("/")) return !value.startsWith("//");
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" || url.protocol === "mailto:";
  } catch {
    return false;
  }
}

export type BlogSanitizeOptions = {
  imageSources?: ReadonlyMap<string, string>;
  dropUnmappedImages?: boolean;
};

/**
 * Sanitizes persisted editorial HTML. This function is used both before writes
 * and again at render time as defense in depth.
 */
export function sanitizeBlogHtml(value: string, options: BlogSanitizeOptions = {}) {
  const normalized = removeLegacyShortcodes(value);
  return sanitizeHtmlLibrary(normalized, {
    allowedTags,
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      th: ["scope"],
      td: ["colspan", "rowspan"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    nonTextTags: ["script", "style", "textarea", "option", "noscript", "iframe", "object", "embed", "form"],
    exclusiveFilter: (frame) => frame.tag === "p"
      && /\bwhatsapp\b/i.test(frame.text)
      && /tel[eé]fono|servicio|asesoramiento/i.test(frame.text),
    transformTags: {
      h1: "h2",
      a: (_tagName, attributes) => {
        const href = attributes.href?.trim();
        if (!href || !isSafeEditorialUrl(href)) return { tagName: "span", attribs: {} };
        const external = href.startsWith("http://") || href.startsWith("https://");
        return {
          tagName: "a",
          attribs: {
            href,
            ...(attributes.title ? { title: attributes.title } : {}),
            ...(external ? { target: "_blank", rel: "noopener noreferrer" } : {}),
          },
        };
      },
      img: (_tagName, attributes) => {
        const source = attributes.src?.trim() || "";
        const mapped = options.imageSources?.get(source)
          ?? (options.dropUnmappedImages && options.imageSources ? "" : source);
        if (!mapped || !isSafeEditorialUrl(mapped)) return { tagName: "span", attribs: {} };
        return {
          tagName: "img",
          attribs: {
            src: mapped,
            alt: (attributes.alt ?? "").trim().slice(0, 240),
            loading: "lazy",
            ...(attributes.title ? { title: attributes.title.slice(0, 240) } : {}),
            ...(attributes.width && /^\d{1,5}$/.test(attributes.width) ? { width: attributes.width } : {}),
            ...(attributes.height && /^\d{1,5}$/.test(attributes.height) ? { height: attributes.height } : {}),
          },
        };
      },
    },
  }).trim();
}

export function htmlToPlainText(value: string) {
  const withoutTags = sanitizeHtmlLibrary(removeLegacyShortcodes(value), {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: "discard",
    nonTextTags: ["script", "style", "textarea", "option", "noscript", "iframe", "object", "embed", "form"],
  });
  return decodeHtmlEntities(withoutTags).replace(/\s+/g, " ").trim();
}

export function createExcerpt(renderedExcerpt: string, contentText: string, maxLength = 320) {
  const preferred = htmlToPlainText(renderedExcerpt);
  const source = preferred.length >= 10 ? preferred : contentText;
  if (source.length <= maxLength) return source;
  const cut = source.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, Math.max(lastSpace, maxLength - 40)).trim()}…`;
}

export function estimateReadingTime(contentText: string) {
  const words = contentText.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function collectEditorialImageUrls(value: string) {
  const sources = new Set<string>();
  sanitizeHtmlLibrary(removeLegacyShortcodes(value), {
    allowedTags: ["img"],
    allowedAttributes: { img: ["src", "data-src"] },
    transformTags: {
      img: (_tagName, attributes) => {
        const source = (attributes.src || attributes["data-src"] || "").trim();
        if (source && isSafeEditorialUrl(source, false)) sources.add(source);
        return { tagName: "img", attribs: {} };
      },
    },
  });
  return [...sources];
}

export function slugifyBlogValue(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}
